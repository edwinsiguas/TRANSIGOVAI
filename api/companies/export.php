<?php

require_once '../config.php';
require_once '../utils/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, null, 'Método no permitido', 405);
}

try {
    // Solo admins y operadores pueden exportar
    $user = authenticateRequest($pdo, ['admin', 'operador']);

    $hoy = date('Y-m-d');

    // Consulta consolidada con subqueries para métricas exactas
    $search = $_GET['search'] ?? '';
    $estado = $_GET['estado'] ?? 'todos';

    $where = [];
    $params = [];

    if ($estado !== 'todos') {
        $where[] = "c.estado = :estado";
        $params[':estado'] = $estado;
    }

    if ($search !== '') {
        $where[] = "(c.nombre LIKE :search OR c.ruc LIKE :search OR c.contacto LIKE :search)";
        $params[':search'] = "%$search%";
    }

    $whereClause = count($where) > 0 ? "WHERE " . implode(' AND ', $where) : "";

    $query = "
        SELECT 
            c.id,
            c.nombre AS razon_social,
            c.ruc,
            c.contacto AS representante_legal,
            c.telefono,
            c.email,
            c.direccion,
            c.estado,
            DATE(c.created_at) AS fecha_registro,
            
            -- Métricas de Vehículos
            (SELECT COUNT(*) FROM vehicles v WHERE v.company_id = c.id AND v.estado = 'activo') AS total_vehiculos,
            (SELECT COUNT(*) FROM vehicles v WHERE v.company_id = c.id AND v.estado = 'activo' AND (v.soat_vencimiento IS NULL OR v.soat_vencimiento < '$hoy')) AS vehiculos_soat_vencido,
            (SELECT COUNT(*) FROM vehicles v WHERE v.company_id = c.id AND v.estado = 'activo' AND (v.rt_vencimiento IS NULL OR v.rt_vencimiento < '$hoy')) AS vehiculos_rt_vencida,
            
            -- Métricas de Conductores
            (SELECT COUNT(*) FROM drivers d WHERE d.company_id = c.id AND d.estado = 'activo') AS total_conductores,
            (SELECT COUNT(*) FROM drivers d WHERE d.company_id = c.id AND d.estado = 'activo' AND (d.fecha_vencimiento_licencia IS NULL OR d.fecha_vencimiento_licencia < '$hoy')) AS conductores_brevete_vencido,
            
            -- Métricas de Permisos (TUC)
            (SELECT COUNT(*) FROM permits p WHERE p.company_id = c.id AND p.estado = 'vigente') AS tucs_vigentes,
            (SELECT COUNT(*) FROM permits p WHERE p.company_id = c.id AND p.estado = 'vencido') AS tucs_vencidos
            
        FROM companies c
        $whereClause
        ORDER BY c.estado ASC, c.nombre ASC
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendResponse(true, $data, 'Exportación exitosa', 200);

} catch (Throwable $e) {
    sendExceptionResponse('Error al exportar empresas', $e, 'Error al exportar empresas');
}

?>
