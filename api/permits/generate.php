<?php

require_once '../config.php';
require_once '../utils/validation.php';
require_once '../utils/auth-middleware.php';
require_once '../utils/qr-generator.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, null, 'Método no permitido', 405);
}

try {
    $user = authenticateRequest($pdo, ['admin', 'operador']);
    $data = getRequestData();
    $data = sanitize($data);

    $validator = new Validator();
    $dbValidator = new DatabaseValidator($pdo);

    $rules = [
        'vehicle_id' => 'required|numeric',
        'fecha_vencimiento' => 'required|date|future_date'
    ];

    if (!$validator->validate($data, $rules)) {
        sendResponse(false, null, 'Validación fallida: ' . $validator->getFirstError(), 400);
    }

    if (!$dbValidator->existsActiveRecord('vehicles', $data['vehicle_id'], 'estado', 'activo')) {
        sendResponse(false, null, 'Vehículo no encontrado', 400);
    }

    $stmt = $pdo->prepare('
        SELECT COUNT(*) as count FROM permits
        WHERE vehicle_id = ? AND estado = ?
    ');
    $stmt->execute([$data['vehicle_id'], 'vigente']);
    $existingPermit = $stmt->fetch();

    if ($existingPermit['count'] > 0) {
        sendResponse(false, null, 'Ya existe un permiso vigente para este vehículo', 400);
    }

    $numeroPermiso = generatePermitNumber($pdo);

    $stmt = $pdo->prepare('
        SELECT v.placa, v.marca, v.modelo, v.driver_id, v.company_id,
               v.soat_vencimiento, v.rt_vencimiento,
               d.nombre_completo as driver_nombre, d.fecha_vencimiento_licencia,
               c.nombre as company_nombre
        FROM vehicles v
        LEFT JOIN drivers d ON v.driver_id = d.id
        LEFT JOIN companies c ON v.company_id = c.id
        WHERE v.id = ?
    ');
    $stmt->execute([$data['vehicle_id']]);
    $vehicleInfo = $stmt->fetch();

    if (!$vehicleInfo) {
        sendResponse(false, null, 'Vehículo no encontrado', 400);
    }

    $hoy = date('Y-m-d');
    $advertencias = [];

    // Validar SOAT
    if (empty($vehicleInfo['soat_vencimiento']) || $vehicleInfo['soat_vencimiento'] < $hoy) {
        $advertencias[] = 'El vehículo no tiene SOAT vigente' .
            (!empty($vehicleInfo['soat_vencimiento']) ? ' (venció el ' . $vehicleInfo['soat_vencimiento'] . ')' : '');
    }

    // Validar Revisión Técnica
    if (empty($vehicleInfo['rt_vencimiento']) || $vehicleInfo['rt_vencimiento'] < $hoy) {
        $advertencias[] = 'El vehículo no tiene Revisión Técnica vigente' .
            (!empty($vehicleInfo['rt_vencimiento']) ? ' (venció el ' . $vehicleInfo['rt_vencimiento'] . ')' : '');
    }

    // Validar brevete del conductor (si tiene conductor asignado)
    if (!empty($vehicleInfo['driver_id'])) {
        if (empty($vehicleInfo['fecha_vencimiento_licencia']) || $vehicleInfo['fecha_vencimiento_licencia'] < $hoy) {
            $advertencias[] = 'La licencia del conductor ' . ($vehicleInfo['driver_nombre'] ?? '') .
                ' está vencida' .
                (!empty($vehicleInfo['fecha_vencimiento_licencia']) ? ' (venció el ' . $vehicleInfo['fecha_vencimiento_licencia'] . ')' : '');
        }
    }

    if (!empty($advertencias)) {
        sendResponse(false, null, 'No se puede emitir el permiso: ' . implode('. ', $advertencias), 422);
    }

    $optionalDriverId   = !empty($vehicleInfo['driver_id'])   ? (int)$vehicleInfo['driver_id']   : null;
    $optionalCompanyId  = !empty($vehicleInfo['company_id'])  ? (int)$vehicleInfo['company_id']  : null;


    $qrData = json_encode([
        'numero_permiso' => $numeroPermiso,
        'placa' => $vehicleInfo['placa'],
        'marca' => $vehicleInfo['marca'],
        'modelo' => $vehicleInfo['modelo'],
        'fecha_emision' => date('Y-m-d'),
        'fecha_vencimiento' => $data['fecha_vencimiento'],
        'municipalidad' => 'Municipalidad de Marcona'
    ]);

    $qrCode = QRGenerator::generateQRBase64($qrData);

    if (!$qrCode) {
        sendResponse(false, null, 'Error generando código QR', 500);
    }

    $stmt = $pdo->prepare('
        INSERT INTO permits (driver_id, vehicle_id, company_id, numero_permiso, fecha_emision, fecha_vencimiento, qr_code, estado, created_by)
        VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?)
    ');

    $stmt->execute([
        $optionalDriverId,
        $data['vehicle_id'],
        $optionalCompanyId,
        $numeroPermiso,
        $data['fecha_vencimiento'],
        $qrCode,
        'vigente',
        $user['id']
    ]);

    $permitId = $pdo->lastInsertId();

    logAction($pdo, $user['id'], 'generar_permiso', 'permiso', $permitId, "Permiso generado: $numeroPermiso para vehículo ID {$data['vehicle_id']}");

    $stmt = $pdo->prepare('
        SELECT p.*, v.placa, v.marca, v.modelo, d.nombre_completo, c.nombre as company_nombre
        FROM permits p
        JOIN vehicles v ON p.vehicle_id = v.id
        LEFT JOIN drivers d ON p.driver_id = d.id
        LEFT JOIN companies c ON p.company_id = c.id
        WHERE p.id = ?
    ');
    $stmt->execute([$permitId]);
    $permit = $stmt->fetch();

    sendResponse(true, $permit, 'Permiso generado exitosamente', 201);

} catch (Throwable $e) {
    sendExceptionResponse('Error al generar permiso', $e, 'Error al generar permiso');
}

?>
