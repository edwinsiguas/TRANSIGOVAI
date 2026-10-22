<?php

require_once '../config.php';
require_once '../utils/auth-middleware.php';

$ns = __DIR__ . '/../services/CirculationValidator.php';
if (file_exists($ns)) { require_once $ns; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, null, 'Método no permitido', 405);
}

try {
    $user = authenticateRequest($pdo, ROLES_VERIFICACION);
    $data = sanitize(getRequestData());

    $placa         = $data['placa']          ?? null;
    $dni           = $data['dni']             ?? null;
    $numeroPermiso = $data['numero_permiso']  ?? null;
    $qrData        = $data['qr_data']         ?? null;

    if (!$placa && !$dni && !$numeroPermiso && !$qrData) {
        sendResponse(false, null, 'Proporcione placa, dni, numero_permiso o qr_data', 400);
    }

    if ($qrData && !$numeroPermiso) {
        $decodedData = base64_decode($qrData);
        $qrInfo = json_decode($decodedData, true);
        if ($qrInfo && isset($qrInfo['numero_permiso'])) {
            $numeroPermiso = $qrInfo['numero_permiso'];
        } else {
            sendResponse(false, null, 'Datos QR inválidos o corruptos', 400);
        }
    }

    if (class_exists('Services\CirculationValidator')) {
        $validator = new \Services\CirculationValidator($pdo);

        if ($placa) {
            $result = $validator->validateByPlaca($placa);
        } elseif ($dni) {
            $result = $validator->validateByDriverDni($dni);
        } else {
            $result = $validator->validateByPermitNumber($numeroPermiso);
        }

        $entityId = $result['data']['permit_id'] ?? ($result['data']['vehicle_id'] ?? 0);
        $logMsg   = $result['puede_circular']
            ? 'Verificación exitosa: ' . $result['razon']
            : 'Verificación fallida: ' . $result['razon'];
        logAction($pdo, $user['id'], 'verificar_qr', 'permiso', $entityId, $logMsg, $_SERVER['REMOTE_ADDR']);

        sendResponse($result['puede_circular'] || !empty($result['data']), $result, $result['razon']);
    }

    $stmt = $pdo->prepare('
        SELECT p.*, d.nombre_completo, d.dni, v.placa, v.marca, v.modelo, c.nombre as company_nombre
        FROM permits p
        JOIN vehicles v ON p.vehicle_id = v.id
        LEFT JOIN drivers d ON p.driver_id = d.id
        LEFT JOIN companies c ON p.company_id = c.id
        WHERE p.numero_permiso = ?
    ');
    $stmt->execute([$numeroPermiso]);
    $permit = $stmt->fetch();

    if (!$permit) {
        logAction($pdo, $user['id'], 'verificar_qr', 'permiso', 0, 'Verificación fallida - Permiso no encontrado', $_SERVER['REMOTE_ADDR']);
        sendResponse(false, null, 'Permiso no encontrado', 404);
    }

    $permit['qr_code'] = null;

    $today = date('Y-m-d');
    $verificado = ($permit['estado'] === 'vigente' && $permit['fecha_vencimiento'] >= $today);

    logAction($pdo, $user['id'], 'verificar_qr', 'permiso', $permit['id'],
        "Permiso {$permit['numero_permiso']} — " . ($verificado ? 'verificado' : 'estado: ' . $permit['estado']),
        $_SERVER['REMOTE_ADDR']
    );

    sendResponse(true, array_merge($permit, [
        'verificado' => $verificado,
        'razon'      => $verificado ? 'Permiso válido' : 'El permiso está ' . $permit['estado'],
    ]), $verificado ? 'Permiso verificado exitosamente' : 'Permiso no vigente');

} catch (Throwable $e) {
    sendExceptionResponse('Error al verificar permiso', $e, 'Error al verificar permiso');
}
