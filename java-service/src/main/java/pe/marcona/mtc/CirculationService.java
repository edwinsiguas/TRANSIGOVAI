package pe.marcona.mtc;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class CirculationService {
    private final JdbcTemplate jdbcTemplate;

    public CirculationService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> validate(Map<String, Object> input) {
        String plate = value(input.get("placa"));
        String dni = value(input.get("dni"));
        String permitNumber = value(input.get("numero_permiso"));
        if (!plate.isBlank()) {
            return validateByPlate(plate);
        }
        if (!dni.isBlank()) {
            if (!dni.matches("\\d{8}")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "dni debe tener 8 dígitos");
            }
            return validateByDni(dni);
        }
        if (!permitNumber.isBlank()) {
            return validateByPermit(permitNumber);
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "Proporcione placa, dni o numero_permiso");
    }

    private Map<String, Object> validateByPlate(String plate) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT v.id AS vehicle_id, v.placa, v.marca, v.modelo, v.color,
                       v.estado AS estado_vehiculo, v.tipo_propiedad,
                       v.soat_vencimiento, v.rt_vencimiento,
                       va.id AS assignment_id, va.tipo AS tipo_asignacion,
                       d.id AS driver_id, d.nombre_completo, d.dni, d.numero_licencia,
                       d.fecha_vencimiento_licencia, d.estado AS estado_conductor,
                       p.id AS permit_id, p.numero_permiso, p.tipo_permiso, p.qr_code,
                       p.fecha_emision, p.fecha_vencimiento AS permiso_vence,
                       p.estado AS estado_permiso, c.nombre AS empresa, c.estado AS estado_empresa
                FROM vehicles v
                JOIN vehicle_assignments va ON va.vehicle_id = v.id AND va.activo = 1
                JOIN drivers d ON va.driver_id = d.id
                LEFT JOIN permits p ON p.vehicle_id = v.id AND p.estado IN ('vigente', 'vencido')
                LEFT JOIN companies c ON v.company_id = c.id
                WHERE v.placa = ?
                ORDER BY p.fecha_vencimiento DESC
                LIMIT 1
                """, plate.trim().toUpperCase());
        if (rows.isEmpty()) {
            return result(false, null, List.of("Vehículo no encontrado o sin conductor asignado actualmente"));
        }
        return evaluate(rows.get(0));
    }

    private Map<String, Object> validateByDni(String dni) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT v.id AS vehicle_id, v.placa, v.marca, v.modelo,
                       v.estado AS estado_vehiculo, v.soat_vencimiento, v.rt_vencimiento,
                       va.id AS assignment_id, va.tipo AS tipo_asignacion,
                       d.id AS driver_id, d.nombre_completo, d.dni, d.numero_licencia,
                       d.fecha_vencimiento_licencia, d.estado AS estado_conductor,
                       p.id AS permit_id, p.numero_permiso, p.tipo_permiso, p.qr_code,
                       p.fecha_emision, p.fecha_vencimiento AS permiso_vence,
                       p.estado AS estado_permiso, c.nombre AS empresa, c.estado AS estado_empresa
                FROM drivers d
                JOIN vehicle_assignments va ON va.driver_id = d.id AND va.activo = 1
                JOIN vehicles v ON va.vehicle_id = v.id
                LEFT JOIN permits p ON p.vehicle_id = v.id AND p.estado IN ('vigente', 'vencido')
                LEFT JOIN companies c ON v.company_id = c.id
                WHERE d.dni = ?
                ORDER BY p.fecha_vencimiento DESC
                LIMIT 1
                """, dni.trim());
        if (rows.isEmpty()) {
            return result(false, null, List.of("Conductor no encontrado o sin vehículo asignado actualmente"));
        }
        return evaluate(rows.get(0));
    }

    private Map<String, Object> validateByPermit(String number) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT v.id AS vehicle_id, v.placa, v.marca, v.modelo,
                       v.estado AS estado_vehiculo, v.soat_vencimiento, v.rt_vencimiento,
                       va.id AS assignment_id, d.id AS driver_id, d.nombre_completo, d.dni,
                       d.numero_licencia, d.fecha_vencimiento_licencia,
                       d.estado AS estado_conductor, p.id AS permit_id, p.numero_permiso,
                       p.tipo_permiso, p.qr_code, p.fecha_emision,
                       p.fecha_vencimiento AS permiso_vence, p.estado AS estado_permiso,
                       c.nombre AS empresa, c.estado AS estado_empresa
                FROM permits p
                JOIN vehicle_assignments va ON p.assignment_id = va.id
                JOIN drivers d ON va.driver_id = d.id
                JOIN vehicles v ON va.vehicle_id = v.id
                LEFT JOIN companies c ON v.company_id = c.id
                WHERE p.numero_permiso = ?
                """, number.trim().toUpperCase());
        if (rows.isEmpty()) {
            rows = jdbcTemplate.queryForList("""
                    SELECT v.id AS vehicle_id, v.placa, v.marca, v.modelo,
                           v.estado AS estado_vehiculo, v.soat_vencimiento, v.rt_vencimiento,
                           d.id AS driver_id, d.nombre_completo, d.dni, d.numero_licencia,
                           d.fecha_vencimiento_licencia, d.estado AS estado_conductor,
                           p.id AS permit_id, p.numero_permiso, p.tipo_permiso, p.qr_code,
                           p.fecha_vencimiento AS permiso_vence, p.estado AS estado_permiso,
                           c.nombre AS empresa, c.estado AS estado_empresa
                    FROM permits p
                    JOIN vehicles v ON p.vehicle_id = v.id
                    LEFT JOIN drivers d ON p.driver_id = d.id
                    LEFT JOIN companies c ON p.company_id = c.id
                    WHERE p.numero_permiso = ?
                    """, number.trim().toUpperCase());
        }
        if (rows.isEmpty()) {
            return result(false, null, List.of("Permiso no encontrado"));
        }
        return evaluate(rows.get(0));
    }

    private Map<String, Object> evaluate(Map<String, Object> row) {
        List<String> blocks = new ArrayList<>();
        if (row.get("empresa") != null && !"activo".equals(row.get("estado_empresa"))) {
            blocks.add("La empresa operadora (" + row.get("empresa") + ") se encuentra SUSPENDIDA.");
        }
        if (!"activo".equals(row.get("estado_vehiculo"))) {
            blocks.add("Vehículo suspendido o inactivo");
        }
        if (!"activo".equals(row.get("estado_conductor"))) {
            blocks.add("Conductor suspendido o inactivo");
        }
        String licenseExpiry = dateValue(row.get("fecha_vencimiento_licencia"));
        if (!licenseExpiry.isBlank() && LocalDate.parse(licenseExpiry).isBefore(LocalDate.now())) {
            blocks.add("Licencia de conducir vencida (" + licenseExpiry + ")");
        }
        if (row.get("permit_id") == null && row.get("numero_permiso") == null) {
            blocks.add("Sin permiso de libre tránsito activo vigente");
        }
        if ("vencido".equals(row.get("estado_permiso"))) {
            blocks.add("Permiso de libre tránsito vencido (" + dateValue(row.get("permiso_vence")) + ")");
        }
        return result(blocks.isEmpty(), row, blocks);
    }

    private Map<String, Object> result(boolean allowed, Map<String, Object> data, List<String> blocks) {
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("puede_circular", allowed);
        result.put("razon", allowed ? "Habilitado para circular correctamente" : String.join(". ", blocks));
        result.put("bloqueos", blocks);
        result.put("verificado", allowed);
        result.put("data", data);
        return result;
    }

    private String dateValue(Object value) {
        if (value instanceof Date date) {
            return date.toLocalDate().toString();
        }
        return value == null ? "" : value.toString();
    }

    private String value(Object value) {
        return value == null ? "" : value.toString().trim();
    }
}
