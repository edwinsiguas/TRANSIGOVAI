<?php

require_once '../config.php';
require_once '../utils/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, null, 'Método no permitido', 405);
}

try {
    $user = authenticateRequest($pdo, ['admin', 'operador']);

    $search = $_GET['search'] ?? '';
    $estado = $_GET['estado'] ?? 'todos';

    $where = [];
    $params = [];

    if ($estado !== 'todos') {
        $where[] = "p.estado = :estado";
        $params[':estado'] = $estado;
    }

    if ($search !== '') {
        $where[] = "(p.numero_permiso LIKE :search OR v.placa LIKE :search OR c.nombre LIKE :search)";
        $params[':search'] = "%$search%";
    }

    $whereClause = count($where) > 0 ? "WHERE " . implode(' AND ', $where) : "";

    $query = "
        SELECT 
            p.id, 
            p.numero_permiso, 
            p.fecha_emision, 
            p.fecha_vencimiento, 
            p.estado,
            v.placa, 
            v.marca, 
            v.modelo, 
            v.soat_vencimiento, 
            v.rt_vencimiento,
            d.nombre_completo AS conductor, 
            d.dni AS conductor_dni,
            c.nombre AS empresa
        FROM permits p
        JOIN vehicles v ON p.vehicle_id = v.id
        LEFT JOIN drivers d ON p.driver_id = d.id
        LEFT JOIN companies c ON p.company_id = c.id
        $whereClause
        ORDER BY p.created_at DESC
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendResponse(true, $data, 'Exportación de permisos exitosa', 200);

} catch (Throwable $e) {
    sendExceptionResponse('Error al exportar permisos', $e, 'Error al exportar permisos');
}

?>
