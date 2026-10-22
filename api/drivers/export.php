<?php

require_once '../config.php';
require_once '../utils/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, null, 'Método no permitido', 405);
}

try {
    $user = authenticateRequest($pdo, ['admin', 'operador']);

    $empresa = $_GET['empresa'] ?? 'todas';
    $estado = $_GET['estado'] ?? 'todos';

    $where = [];
    $params = [];

    if ($estado !== 'todos') {
        $where[] = "d.estado = :estado";
        $params[':estado'] = $estado;
    }

    if ($empresa !== 'todas' && $empresa !== '') {
        $where[] = "d.company_id = :empresa";
        $params[':empresa'] = $empresa;
    }

    $whereClause = count($where) > 0 ? "WHERE " . implode(' AND ', $where) : "";

    $query = "
        SELECT 
            d.id, 
            d.nombre_completo, 
            d.dni, 
            d.telefono, 
            d.numero_licencia, 
            d.fecha_vencimiento_licencia, 
            d.estado,
            v.placa AS vehiculo_asignado,
            c.nombre AS empresa
        FROM drivers d
        LEFT JOIN vehicle_assignments va ON va.driver_id = d.id AND va.activo = 1
        LEFT JOIN vehicles v ON va.vehicle_id = v.id
        LEFT JOIN companies c ON d.company_id = c.id
        $whereClause
        ORDER BY d.estado ASC, d.nombre_completo ASC
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendResponse(true, $data, 'Exportación de conductores exitosa', 200);

} catch (Throwable $e) {
    sendExceptionResponse('Error al exportar conductores', $e, 'Error al exportar conductores');
}

?>
