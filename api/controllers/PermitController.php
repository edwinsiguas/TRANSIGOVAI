<?php
namespace Controllers;

use Services\PermitService;
use Services\CirculationValidator;

class PermitController
{
    private PermitService $service;
    private CirculationValidator $validator;
    private \PDO $pdo;

    public function __construct()
    {
        $this->pdo       = \Config\Database::getConnection();
        $this->service   = new PermitService($this->pdo);
        $this->validator = new CirculationValidator($this->pdo);

        require_once __DIR__ . '/../utils/rate-limiter.php';
    }

    public function list(): void
    {
        $user = authenticateRequest($this->pdo, ['admin', 'operador']);

        $filters = [
            'search'     => $_GET['search']     ?? '',
            'estado'     => $_GET['estado']     ?? '',
            'vehicle_id' => $_GET['vehicle_id'] ?? null,
            'driver_id'  => $_GET['driver_id']  ?? null,
            'company_id' => $_GET['company_id'] ?? null,
            'expiring_soon' => $_GET['expiring_soon'] ?? null,
            'page'       => (int) ($_GET['page']  ?? 1),
            'limit'      => (int) ($_GET['limit'] ?? 10),
        ];

        sendResponse(true, $this->service->listPermits($filters));
    }

    public function get(): void
    {
        $user     = authenticateRequest($this->pdo, ['admin', 'operador']);
        $permitId = (int) $this->getUriSegment(-1);

        try {
            $permit = $this->service->getPermitById($permitId);
            sendResponse(true, $permit);
        } catch (\RuntimeException $e) {
            sendResponse(false, null, $e->getMessage(), 404);
        }
    }

    public function generate(): void
    {
        $user = authenticateRequest($this->pdo, ['admin', 'operador']);
        $data = sanitize(getRequestData());

        if (empty($data['vehicle_id']) || empty($data['fecha_vencimiento'])) {
            sendResponse(false, null, 'vehicle_id y fecha_vencimiento son obligatorios', 400);
        }

        $tiposValidos = ['libre_transito', 'ruta_fija', 'carga', 'especial'];
        $tipo = $data['tipo_permiso'] ?? 'libre_transito';
        if (!in_array($tipo, $tiposValidos, true)) {
            sendResponse(false, null, 'Tipo de permiso inválido. Use: ' . implode(', ', $tiposValidos), 400);
        }

        try {
            $permit = $this->service->generatePermit(
                (int) $data['vehicle_id'],
                $data['fecha_vencimiento'],
                $tipo,
                $user['id'],
                $data['observaciones'] ?? ''
            );

            logAction(
                $this->pdo, $user['id'], 'generar_permiso', 'permiso',
                $permit['id'], 'Permiso generado: ' . $permit['numero_permiso']
            );

            sendResponse(true, $permit, 'Permiso generado exitosamente', 201);
        } catch (\InvalidArgumentException $e) {
            sendResponse(false, null, $e->getMessage(), 400);
        } catch (\RuntimeException $e) {
            sendResponse(false, null, $e->getMessage(), 422);
        }
    }

    public function revoke(): void
    {
        $user     = authenticateRequest($this->pdo, ['admin']);
        $permitId = (int) $this->getUriSegment(-2);
        $data     = sanitize(getRequestData());
        $motivo   = $data['motivo'] ?? 'Revocado por administrador';

        $revoked = $this->service->revokePermit($permitId, $motivo, $user['id']);

        if (!$revoked) {
            sendResponse(false, null, 'Permiso no encontrado o ya no está vigente', 404);
        }

        logAction($this->pdo, $user['id'], 'revocar_permiso', 'permiso', $permitId, $motivo);
        sendResponse(true, null, 'Permiso revocado correctamente');
    }

    public function renew(): void
    {
        $user     = authenticateRequest($this->pdo, ['admin']);
        $permitId = (int) $this->getUriSegment(-2);
        $data     = sanitize(getRequestData());

        try {
            $newPermit = $this->service->renewPermit($permitId, $data, $user['id']);
            logAction($this->pdo, $user['id'], 'renovar_permiso', 'permiso', $newPermit['id'], 'Permiso renovado a partir del ID ' . $permitId);
            sendResponse(true, $newPermit, 'Permiso renovado exitosamente', 201);
        } catch (\RuntimeException $e) {
            sendResponse(false, null, $e->getMessage(), 422);
        } catch (\Throwable $e) {
            sendExceptionResponse('Error al renovar permiso', $e, 'Error interno al renovar permiso');
        }
    }

    public function verify(): void
    {

        \RateLimiter::check($this->pdo, 'permit_verify', maxRequests: 30, windowSeconds: 60);
        $data = sanitize(getRequestData());

        $placa         = $data['placa']          ?? ($_GET['placa']          ?? null);
        $dni           = $data['dni']             ?? ($_GET['dni']             ?? null);
        $numeroPermiso = $data['numero_permiso']  ?? ($_GET['numero_permiso']  ?? null);

        try {
            if ($placa) {
                $result = $this->validator->validateByPlaca($placa);
            } elseif ($dni) {
                if (!preg_match('/^\d{8}$/', (string) $dni)) {
                    sendResponse(false, null, 'dni debe tener 8 dígitos', 400);
                    return;
                }
                $result = $this->validator->validateByDriverDni($dni);
            } elseif ($numeroPermiso) {
                $result = $this->validator->validateByPermitNumber($numeroPermiso);
            } else {
                sendResponse(false, null, 'Proporcione placa, dni o numero_permiso', 400);
                return;
            }
            sendResponse(true, $result, $result['razon']);
        } catch (\Throwable $e) {
            sendExceptionResponse('Error al verificar', $e, 'Error al verificar permiso');
        }
    }

    public function vehicleImages(): void
    {
        $vehicleId = (int) $this->getUriSegment(-1);
        if ($vehicleId <= 0) {
            sendResponse(false, null, 'vehicle_id inválido', 400);
            return;
        }

        $stmt = $this->pdo->prepare("
            SELECT file_path, sort_order
            FROM   vehicle_images
            WHERE  vehicle_id = ?
            ORDER  BY sort_order ASC, id ASC
            LIMIT  2
        ");
        $stmt->execute([$vehicleId]);
        $rows = $stmt->fetchAll();

        $apiBase = rtrim(API_URL, '/');

        $images = array_map(fn($r) => [
            'url'        => $apiBase . '/' . ltrim($r['file_path'], '/'),
            'sort_order' => (int) $r['sort_order'],
        ], $rows);

        sendResponse(true, $images);
    }

    public function markExpired(): void
    {
        $user  = authenticateRequest($this->pdo, ['admin']);
        $expiredPermitIds = $this->service->markExpired($user['id']);
        $count = count($expiredPermitIds);
        sendResponse(true, ['marcados_vencidos' => $count], "$count permiso(s) marcados como vencidos");
    }

    private function getUriSegment(int $index): string
    {
        $uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $parts  = array_values(array_filter(explode('/', $uri)));
        $count  = count($parts);
        $absIdx = $index < 0 ? $count + $index : $index;
        return $parts[$absIdx] ?? '';
    }
}
