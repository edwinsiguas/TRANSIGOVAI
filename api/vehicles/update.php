<?php

require_once '../config.php';
require_once '../utils/validation.php';
require_once '../utils/auth-middleware.php';

if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'POST'])) {
    sendResponse(false, null, 'Método no permitido', 405);
}

try {
    $user = authenticateRequest($pdo, ['admin', 'operador']);
    $data = sanitize(getRequestData());

    $id = $data['id'] ?? ($_GET['id'] ?? null);
    if (!$id || !is_numeric($id)) {
        sendResponse(false, null, 'ID inválido', 400);
    }

    $id = (int)$id;

    $stmt = $pdo->prepare('SELECT id FROM vehicles WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        sendResponse(false, null, 'Vehículo no encontrado', 404);
    }

    $fields = [];
    $params = [];

    foreach (['driver_id', 'company_id'] as $optionalField) {
        if (isset($data[$optionalField]) && $data[$optionalField] !== '' && !is_numeric($data[$optionalField])) {
            sendResponse(false, null, 'El campo ' . $optionalField . ' debe ser numérico', 400);
        }
        if (array_key_exists($optionalField, $data)) {
            $fields[] = $optionalField . ' = ?';
            $params[] = $data[$optionalField] !== '' ? (int)$data[$optionalField] : null;
        }
    }

    foreach (['placa', 'marca', 'modelo', 'color', 'numero_vin', 'estado',
               'soat_poliza', 'soat_aseguradora', 'soat_vencimiento',
               'rt_entidad', 'rt_certificado', 'rt_vencimiento',
               'ano_fabricacion', 'numero_motor', 'combustible',
               'tipo_servicio', 'tipo_propiedad', 'categoria'] as $field) {
        if (!array_key_exists($field, $data)) {
            continue;
        }

        // Campos que admiten valor vacío (se guardan como NULL)
        $nullableFields = ['soat_poliza', 'soat_aseguradora', 'soat_vencimiento',
                           'rt_entidad', 'rt_certificado', 'rt_vencimiento',
                           'numero_vin', 'ano_fabricacion', 'numero_motor', 'combustible',
                           'tipo_servicio'];

        if (!in_array($field, $nullableFields) && $data[$field] === '') {
            continue;
        }

        if ($field === 'estado' && !in_array($data[$field], ['activo', 'inactivo'], true)) {
            sendResponse(false, null, 'Estado inválido', 400);
        }

        $value = $data[$field] === '' ? null : $data[$field];
        if ($field === 'placa') $value = strtoupper($value ?? '');
        if ($field === 'ano_fabricacion' && $value !== null) $value = (int)$value;

        $fields[] = $field . ' = ?';
        $params[] = $value;
    }

    if (empty($fields)) {
        sendResponse(false, null, 'No hay campos para actualizar', 400);
    }

    if (isset($data['placa']) && $data['placa'] !== '') {
        $dbValidator = new DatabaseValidator($pdo);
        if (!$dbValidator->isUnique('vehicles', 'placa', strtoupper($data['placa']), $id)) {
            sendResponse(false, null, 'La placa ya está registrada', 400);
        }
    }

    $fields[] = 'updated_at = NOW()';
    $params[] = $id;

    $sql = 'UPDATE vehicles SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    logAction($pdo, $user['id'], 'actualizar', 'vehiculo', $id, 'Vehículo actualizado');

    $stmt = $pdo->prepare('SELECT * FROM vehicles WHERE id = ?');
    $stmt->execute([$id]);

    sendResponse(true, $stmt->fetch(), 'Vehículo actualizado exitosamente', 200);
} catch (Throwable $e) {
    sendExceptionResponse('Error al actualizar vehículo', $e, 'Error al actualizar vehículo');
}

?>
