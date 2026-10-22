<?php
namespace Services;

use PDO;

class CirculationValidator
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function validateByPlaca(string $placa): array
    {
        $stmt = $this->pdo->prepare("
            SELECT
                v.id            AS vehicle_id,
                v.placa,
                v.marca,
                v.modelo,
                v.color,
                v.estado        AS estado_vehiculo,
                v.tipo_propiedad,
                v.soat_vencimiento,
                v.rt_vencimiento,
                va.id           AS assignment_id,
                va.tipo         AS tipo_asignacion,
                d.id            AS driver_id,
                d.nombre_completo,
                d.dni,
                d.numero_licencia,
                d.fecha_vencimiento_licencia,
                d.estado        AS estado_conductor,
                p.id            AS permit_id,
                p.numero_permiso,
                p.tipo_permiso,
                p.qr_code,
                p.fecha_emision,
                p.fecha_vencimiento AS permiso_vence,
                p.estado        AS estado_permiso,
                c.nombre        AS empresa,
                c.estado        AS estado_empresa
            FROM   vehicles v
            JOIN   vehicle_assignments va ON va.vehicle_id = v.id AND va.activo = 1
            JOIN   drivers  d             ON va.driver_id  = d.id
            LEFT JOIN permits p ON (
                p.vehicle_id = v.id
                AND p.estado IN ('vigente', 'vencido')
            )
            LEFT JOIN companies c ON v.company_id = c.id
            WHERE  v.placa = ?
            ORDER BY p.fecha_vencimiento DESC
            LIMIT  1
        ");
        $stmt->execute([strtoupper(trim($placa))]);
        $row = $stmt->fetch();

        if (!$row) {
            return $this->buildResult(
                false,
                null,
                ['Vehículo no encontrado o sin conductor asignado actualmente']
            );
        }

        return $this->evaluateRow($row);
    }

    public function validateByDriverDni(string $dni): array
    {
        $stmt = $this->pdo->prepare("
            SELECT
                v.id            AS vehicle_id,
                v.placa,
                v.marca,
                v.modelo,
                v.estado        AS estado_vehiculo,
                v.soat_vencimiento,
                v.rt_vencimiento,
                va.id           AS assignment_id,
                va.tipo         AS tipo_asignacion,
                d.id            AS driver_id,
                d.nombre_completo,
                d.dni,
                d.numero_licencia,
                d.fecha_vencimiento_licencia,
                d.estado        AS estado_conductor,
                p.numero_permiso,
                p.qr_code,
                p.fecha_vencimiento AS permiso_vence,
                p.estado        AS estado_permiso,
                c.nombre        AS empresa,
                c.estado        AS estado_empresa
            FROM   drivers d
            JOIN   vehicle_assignments va ON va.driver_id = d.id AND va.activo = 1
            JOIN   vehicles v             ON va.vehicle_id = v.id
            LEFT JOIN permits p ON (
                p.vehicle_id = v.id
                AND p.estado IN ('vigente', 'vencido')
            )
            LEFT JOIN companies c ON v.company_id = c.id
            WHERE  d.dni = ?
            ORDER BY p.fecha_vencimiento DESC
            LIMIT  1
        ");
        $stmt->execute([trim($dni)]);
        $row = $stmt->fetch();

        if (!$row) {
            return $this->buildResult(
                false,
                null,
                ['Conductor no encontrado o sin vehículo asignado actualmente']
            );
        }

        return $this->evaluateRow($row);
    }

    public function validateByPermitNumber(string $numeroPermiso): array
    {
        $stmt = $this->pdo->prepare("
            SELECT
                v.id            AS vehicle_id,
                v.placa,
                v.marca,
                v.modelo,
                v.estado        AS estado_vehiculo,
                v.soat_vencimiento,
                v.rt_vencimiento,
                va.id           AS assignment_id,
                d.nombre_completo,
                d.dni,
                d.numero_licencia,
                d.fecha_vencimiento_licencia,
                d.estado        AS estado_conductor,
                p.numero_permiso,
                p.tipo_permiso,
                p.qr_code,
                p.fecha_emision,
                p.fecha_vencimiento AS permiso_vence,
                p.estado        AS estado_permiso,
                c.nombre        AS empresa,
                c.estado        AS estado_empresa
            FROM   permits p
            JOIN   vehicle_assignments va ON p.assignment_id = va.id
            JOIN   drivers  d             ON va.driver_id    = d.id
            JOIN   vehicles v             ON va.vehicle_id   = v.id
            LEFT JOIN companies c         ON v.company_id    = c.id
            WHERE  p.numero_permiso = ?
        ");
        $stmt->execute([strtoupper(trim($numeroPermiso))]);
        $row = $stmt->fetch();

        if (!$row) {

            $stmt2 = $this->pdo->prepare("
                SELECT
                    v.placa, v.marca, v.modelo, v.estado AS estado_vehiculo, v.soat_vencimiento, v.rt_vencimiento,
                    d.nombre_completo, d.dni, d.fecha_vencimiento_licencia,
                    d.estado AS estado_conductor,
                    p.numero_permiso, p.qr_code, p.fecha_vencimiento AS permiso_vence,
                    p.estado AS estado_permiso, c.nombre AS empresa, c.estado AS estado_empresa
                FROM permits p
                JOIN vehicles v ON p.vehicle_id = v.id
                LEFT JOIN drivers d ON p.driver_id = d.id
                LEFT JOIN companies c ON p.company_id = c.id
                WHERE p.numero_permiso = ?
            ");
            $stmt2->execute([strtoupper(trim($numeroPermiso))]);
            $row = $stmt2->fetch();

            if (!$row) {
                return $this->buildResult(false, null, ['Permiso no encontrado']);
            }
        }

        return $this->evaluateRow($row);
    }

    private function evaluateRow(array $row): array
    {
        $today   = date('Y-m-d');
        $bloqueos = [];

        if (!empty($row['empresa']) && ($row['estado_empresa'] ?? '') !== 'activo') {
            $bloqueos[] = 'La empresa operadora (' . $row['empresa'] . ') se encuentra SUSPENDIDA.';
        }

        if (($row['estado_vehiculo'] ?? '') !== 'activo') {
            $bloqueos[] = 'Vehículo suspendido o inactivo';
        }
        if (($row['estado_conductor'] ?? '') !== 'activo') {
            $bloqueos[] = 'Conductor suspendido o inactivo';
        }
        if (!empty($row['fecha_vencimiento_licencia']) && $row['fecha_vencimiento_licencia'] < $today) {
            $bloqueos[] = 'Licencia de conducir vencida (' . $row['fecha_vencimiento_licencia'] . ')';
        }
        if (empty($row['permit_id']) && empty($row['numero_permiso'])) {
            $bloqueos[] = 'Sin permiso de libre tránsito activo vigente';
        }
        if (!empty($row['permiso_vence']) && $row['permiso_vence'] < $today && ($row['estado_permiso'] ?? '') === 'vigente') {
            // El permiso existe pero está vigente todavía según la BD - no bloquear
        }
        if (!empty($row['estado_permiso']) && $row['estado_permiso'] === 'vencido') {
            $bloqueos[] = 'Permiso de libre tránsito vencido (' . ($row['permiso_vence'] ?? 'fecha desconocida') . ')';
        }

        return $this->buildResult(empty($bloqueos), $row, $bloqueos);
    }

    private function buildResult(bool $puedeCircular, ?array $data, array $bloqueos): array
    {
        return [
            'puede_circular' => $puedeCircular,
            'razon'         => $puedeCircular
                ? 'Habilitado para circular correctamente'
                : implode('. ', $bloqueos),
            'bloqueos'      => $bloqueos,
            'verificado'    => $puedeCircular,
            'data'          => $data,
        ];
    }
}
