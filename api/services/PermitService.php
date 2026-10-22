<?php
namespace Services;

use PDO;

class PermitService
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function generatePermit(
        int $vehicleId,
        string $fechaVencimiento,
        string $tipoPermiso = 'libre_transito',
        int $createdBy = 0,
        string $observaciones = ''
    ): array {

        if ($fechaVencimiento <= date('Y-m-d')) {
            throw new \InvalidArgumentException('La fecha de vencimiento debe ser posterior a hoy');
        }

        $vehicle = $this->pdo->prepare("SELECT * FROM vehicles WHERE id = ? AND estado = 'activo'");
        $vehicle->execute([$vehicleId]);
        $vehicleData = $vehicle->fetch();
        if (!$vehicleData) {
            throw new \RuntimeException('Vehículo no encontrado o inactivo');
        }

        $aStmt = $this->pdo->prepare("
            SELECT va.*, d.nombre_completo, d.dni, d.fecha_vencimiento_licencia, d.estado AS estado_conductor
            FROM   vehicle_assignments va
            JOIN   drivers d ON va.driver_id = d.id
            WHERE  va.vehicle_id = ? AND va.activo = 1
        ");
        $aStmt->execute([$vehicleId]);
        $assignment = $aStmt->fetch();

        if (!$assignment) {
            throw new \RuntimeException('El vehículo no tiene un conductor asignado. Asigne un conductor primero.');
        }

        if ($assignment['fecha_vencimiento_licencia'] < date('Y-m-d')) {
            throw new \RuntimeException(
                'La licencia del conductor ' . $assignment['nombre_completo'] . ' está vencida. Actualícela primero.'
            );
        }

        $existing = $this->pdo->prepare("
            SELECT COUNT(*) FROM permits
            WHERE assignment_id = ? AND estado = 'vigente' AND fecha_vencimiento >= CURDATE()
        ");
        $existing->execute([$assignment['id']]);
        if ((int) $existing->fetchColumn() > 0) {
            throw new \RuntimeException('Ya existe un permiso vigente para este vehículo con el conductor actual');
        }

        $numeroPermiso = $this->generatePermitNumber();

        $baseUrl = rtrim(APP_URL, '/');
        $qrData  = $baseUrl . '/tuc/' . $numeroPermiso;

        $qrCode = null;
        if (file_exists(__DIR__ . '/../utils/qr-generator.php')) {
            require_once __DIR__ . '/../utils/qr-generator.php';
            $qrCode = \QRGenerator::generateQRBase64($qrData);
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO permits
                (assignment_id, vehicle_id, driver_id, company_id, numero_permiso,
                 tipo_permiso, fecha_emision, fecha_vencimiento, observaciones, qr_code, estado, created_by)
            VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, 'vigente', ?)
        ");
        $stmt->execute([
            $assignment['id'],
            $vehicleId,
            $assignment['driver_id'],
            $vehicleData['company_id'],
            $numeroPermiso,
            $tipoPermiso,
            $fechaVencimiento,
            $observaciones,
            $qrCode,
            $createdBy,
        ]);

        $permitId = (int) $this->pdo->lastInsertId();
        return $this->getPermitById($permitId);
    }

    public function revokePermit(int $permitId, string $motivo, int $revokedBy): bool
    {
        $stmt = $this->pdo->prepare("
            UPDATE permits SET estado = 'revocado', observaciones = CONCAT(COALESCE(observaciones,''), ' | REVOCADO: ', ?)
            WHERE id = ? AND estado = 'vigente'
        ");
        $stmt->execute([$motivo, $permitId]);
        return $stmt->rowCount() > 0;
    }

    public function renewPermit(int $oldPermitId, array $data, int $userId): array
    {
        $oldPermit = $this->getPermitById($oldPermitId);

        if ($oldPermit['estado'] === 'revocado') {
            throw new \RuntimeException('No se puede renovar un permiso revocado');
        }

        $vStmt = $this->pdo->prepare("SELECT * FROM vehicles WHERE id = ?");
        $vStmt->execute([$oldPermit['vehicle_id']]);
        $vehicle = $vStmt->fetch();

        if ($vehicle['estado'] !== 'activo') {
            throw new \RuntimeException('El vehículo está inactivo');
        }

        if (empty($vehicle['soat_vencimiento']) || $vehicle['soat_vencimiento'] < date('Y-m-d')) {
            throw new \RuntimeException('El vehículo no tiene SOAT vigente');
        }

        if (empty($vehicle['rt_vencimiento']) || $vehicle['rt_vencimiento'] < date('Y-m-d')) {
            throw new \RuntimeException('El vehículo no tiene Revisión Técnica vigente');
        }

        $dStmt = $this->pdo->prepare("SELECT * FROM drivers WHERE id = ?");
        $dStmt->execute([$oldPermit['driver_id']]);
        $driver = $dStmt->fetch();

        if (empty($driver['fecha_vencimiento_licencia']) || $driver['fecha_vencimiento_licencia'] < date('Y-m-d')) {
            throw new \RuntimeException('La licencia del conductor está vencida');
        }

        $aStmt = $this->pdo->prepare("SELECT id FROM vehicle_assignments WHERE id = ? AND activo = 1");
        $aStmt->execute([$oldPermit['assignment_id']]);
        if (!$aStmt->fetch()) {
            throw new \RuntimeException('La asignación vinculada a este permiso ya no está activa');
        }

        $this->pdo->beginTransaction();
        try {

            $uStmt = $this->pdo->prepare("UPDATE permits SET estado = 'renovado' WHERE id = ?");
            $uStmt->execute([$oldPermitId]);

            $newVencimiento = date('Y-m-d', strtotime('+1 year'));
            $numeroPermiso = $this->generatePermitNumber();

            $baseUrl = rtrim(APP_URL, '/');
            $qrData  = $baseUrl . '/tuc/' . $numeroPermiso;

            $qrCode = null;
            if (file_exists(__DIR__ . '/../utils/qr-generator.php')) {
                require_once __DIR__ . '/../utils/qr-generator.php';
                $qrCode = \QRGenerator::generateQRBase64($qrData);
            }

            $obs = !empty($data['observaciones']) ? $data['observaciones'] : 'Renovación de permiso ' . $oldPermit['numero_permiso'];

            $iStmt = $this->pdo->prepare("
                INSERT INTO permits
                    (assignment_id, vehicle_id, driver_id, company_id, numero_permiso,
                     tipo_permiso, fecha_emision, fecha_vencimiento, observaciones, qr_code, estado, created_by, numero_recibo, monto_pagado)
                VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, 'vigente', ?, ?, ?)
            ");

            $iStmt->execute([
                $oldPermit['assignment_id'],
                $oldPermit['vehicle_id'],
                $oldPermit['driver_id'],
                $oldPermit['company_id'],
                $numeroPermiso,
                $oldPermit['tipo_permiso'],
                $newVencimiento,
                $obs,
                $qrCode,
                $userId,
                $data['numero_recibo'] ?? null,
                $data['monto_pagado'] ?? null
            ]);

            $newPermitId = (int) $this->pdo->lastInsertId();
            $this->pdo->commit();

            return $this->getPermitById($newPermitId);
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function markExpired(int|string $userId): array
    {
        return \expirePermits($this->pdo, $userId);
    }

    public function listPermits(array $filters = []): array
    {
        $where  = [];
        $params = [];

        if (!empty($filters['search'])) {
            $where[]  = '(p.numero_permiso LIKE ? OR d.nombre_completo LIKE ? OR v.placa LIKE ?)';
            $s = '%' . $filters['search'] . '%';
            $params = array_merge($params, [$s, $s, $s]);
        }
        if (!empty($filters['estado'])) {
            $where[] = 'p.estado = ?';
            $params[] = $filters['estado'];
        }
        if (!empty($filters['vehicle_id'])) {
            $where[] = 'p.vehicle_id = ?';
            $params[] = (int) $filters['vehicle_id'];
        }
        if (!empty($filters['driver_id'])) {
            $where[] = 'p.driver_id = ?';
            $params[] = (int) $filters['driver_id'];
        }
        if (!empty($filters['company_id'])) {
            $where[] = 'p.company_id = ?';
            $params[] = (int) $filters['company_id'];
        }
        if (isset($filters['expiring_soon']) && $filters['expiring_soon'] == '1') {
            $where[] = "p.estado IN ('vigente', 'vencido')";
            $where[] = "p.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)";
        }

        $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $page     = max(1, (int) ($filters['page']  ?? 1));
        $limit    = max(1, (int) ($filters['limit'] ?? 10));
        $offset   = ($page - 1) * $limit;

        $cStmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM permits p
            JOIN vehicles v ON p.vehicle_id = v.id
            LEFT JOIN drivers d ON p.driver_id = d.id
            LEFT JOIN companies c ON p.company_id = c.id
            $whereSQL
        ");
        $cStmt->execute($params);
        $total = (int) $cStmt->fetchColumn();

        $dStmt = $this->pdo->prepare("
            SELECT p.id, p.numero_permiso, p.tipo_permiso, p.fecha_emision,
                   p.fecha_vencimiento, p.estado, p.observaciones,
                   v.placa, v.marca, v.modelo, v.categoria,
                   d.nombre_completo, d.dni,
                   d.numero_licencia, d.fecha_vencimiento_licencia,
                   c.nombre AS empresa
            FROM permits p
            JOIN vehicles v ON p.vehicle_id = v.id
            LEFT JOIN drivers d ON p.driver_id = d.id
            LEFT JOIN companies c ON p.company_id = c.id
            $whereSQL
            ORDER BY p.created_at DESC
            LIMIT $limit OFFSET $offset
        ");
        $dStmt->execute($params);

        return [
            'data'       => $dStmt->fetchAll(),
            'pagination' => [
                'page'  => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => $total > 0 ? (int) ceil($total / $limit) : 0,
            ],
        ];
    }

    public function getPermitById(int $id): array
    {
        $stmt = $this->pdo->prepare("
            SELECT p.*, v.placa, v.marca, v.modelo, v.categoria,
                   d.nombre_completo, d.dni,
                   d.numero_licencia, d.fecha_vencimiento_licencia,
                   c.nombre AS empresa
            FROM permits p
            JOIN vehicles v ON p.vehicle_id = v.id
            LEFT JOIN drivers d ON p.driver_id = d.id
            LEFT JOIN companies c ON p.company_id = c.id
            WHERE p.id = ?
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        if (!$result) {
            throw new \RuntimeException("Permiso $id no encontrado");
        }
        return $result;
    }

    private function generatePermitNumber(): string
    {
        $year = (int) date('Y');
        $this->pdo->prepare(
            "INSERT IGNORE INTO permit_sequences (year, last_number) VALUES (?, 0)"
        )->execute([$year]);

        $this->pdo->prepare(
            "UPDATE permit_sequences SET last_number = last_number + 1 WHERE year = ?"
        )->execute([$year]);

        $seq = (int) $this->pdo->query(
            "SELECT last_number FROM permit_sequences WHERE year = $year"
        )->fetchColumn();

        return sprintf('PERM-%d-%05d', $year, $seq);
    }
}
