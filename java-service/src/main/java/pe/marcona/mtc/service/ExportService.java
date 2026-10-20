package pe.marcona.mtc.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ExportService {
    private final JdbcTemplate jdbcTemplate;

    public ExportService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> exportCompanies(Map<String, String> query) {
        List<String> conditions = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        String estado = query.get("estado");
        if (estado != null && !estado.isBlank() && !"todos".equalsIgnoreCase(estado)) {
            conditions.add("c.estado = ?");
            params.add(estado.trim());
        }

        String search = query.get("search");
        if (search != null && !search.isBlank()) {
            conditions.add("(c.nombre LIKE ? OR c.ruc LIKE ? OR c.contacto LIKE ?)");
            String term = "%" + search.trim() + "%";
            params.add(term);
            params.add(term);
            params.add(term);
        }

        String where = conditions.isEmpty() ? "" : " WHERE " + String.join(" AND ", conditions);

        return jdbcTemplate.queryForList("""
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
                    (SELECT COUNT(*) FROM vehicles v WHERE v.company_id = c.id AND v.estado = 'activo') AS total_vehiculos,
                    (SELECT COUNT(*) FROM vehicles v WHERE v.company_id = c.id AND v.estado = 'activo' AND (v.soat_vencimiento IS NULL OR v.soat_vencimiento < CURDATE())) AS vehiculos_soat_vencido,
                    (SELECT COUNT(*) FROM vehicles v WHERE v.company_id = c.id AND v.estado = 'activo' AND (v.rt_vencimiento IS NULL OR v.rt_vencimiento < CURDATE())) AS vehiculos_rt_vencida,
                    (SELECT COUNT(*) FROM drivers d WHERE d.company_id = c.id AND d.estado = 'activo') AS total_conductores,
                    (SELECT COUNT(*) FROM drivers d WHERE d.company_id = c.id AND d.estado = 'activo' AND (d.fecha_vencimiento_licencia IS NULL OR d.fecha_vencimiento_licencia < CURDATE())) AS conductores_brevete_vencido,
                    (SELECT COUNT(*) FROM permits p WHERE p.company_id = c.id AND p.estado = 'vigente') AS tucs_vigentes,
                    (SELECT COUNT(*) FROM permits p WHERE p.company_id = c.id AND p.estado = 'vencido') AS tucs_vencidos
                FROM companies c
                """ + where + " ORDER BY c.estado ASC, c.nombre ASC", params.toArray())
                .stream().map(this::formatRow).toList();
    }

    public List<Map<String, Object>> exportDrivers(Map<String, String> query) {
        List<String> conditions = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        String estado = query.get("estado");
        if (estado != null && !estado.isBlank() && !"todos".equalsIgnoreCase(estado)) {
            conditions.add("d.estado = ?");
            params.add(estado.trim());
        }

        String empresa = query.get("empresa");
        if (empresa != null && !empresa.isBlank() && !"todas".equalsIgnoreCase(empresa)) {
            try {
                long companyId = Long.parseLong(empresa.trim());
                conditions.add("d.company_id = ?");
                params.add(companyId);
            } catch (NumberFormatException ignored) { }
        }

        String where = conditions.isEmpty() ? "" : " WHERE " + String.join(" AND ", conditions);

        return jdbcTemplate.queryForList("""
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
                """ + where + " ORDER BY d.estado ASC, d.nombre_completo ASC", params.toArray())
                .stream().map(this::formatRow).toList();
    }

    public List<Map<String, Object>> exportVehicles(Map<String, String> query) {
        List<String> conditions = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        String estado = query.get("estado");
        if (estado != null && !estado.isBlank() && !"todos".equalsIgnoreCase(estado)) {
            conditions.add("v.estado = ?");
            params.add(estado.trim());
        }

        String search = query.get("search");
        if (search != null && !search.isBlank()) {
            conditions.add("(v.placa LIKE ? OR c.nombre LIKE ? OR d.nombre_completo LIKE ?)");
            String term = "%" + search.trim() + "%";
            params.add(term);
            params.add(term);
            params.add(term);
        }

        String where = conditions.isEmpty() ? "" : " WHERE " + String.join(" AND ", conditions);

        return jdbcTemplate.queryForList("""
                SELECT 
                    v.id, 
                    v.placa, 
                    v.marca, 
                    v.modelo, 
                    v.color, 
                    v.ano_fabricacion,
                    v.ano_fabricacion AS anio_fabricacion, 
                    v.numero_vin,
                    v.soat_vencimiento, 
                    v.rt_vencimiento, 
                    v.estado,
                    d.nombre_completo AS conductor_asignado, 
                    c.nombre AS empresa
                FROM vehicles v
                LEFT JOIN vehicle_assignments va ON va.vehicle_id = v.id AND va.activo = 1
                LEFT JOIN drivers d ON va.driver_id = d.id
                LEFT JOIN companies c ON v.company_id = c.id
                """ + where + " ORDER BY v.estado ASC, c.nombre ASC, v.placa ASC", params.toArray())
                .stream().map(this::formatRow).toList();
    }

    public List<Map<String, Object>> exportPermits(Map<String, String> query) {
        List<String> conditions = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        String estado = query.get("estado");
        if (estado != null && !estado.isBlank() && !"todos".equalsIgnoreCase(estado)) {
            conditions.add("p.estado = ?");
            params.add(estado.trim());
        }

        String search = query.get("search");
        if (search != null && !search.isBlank()) {
            conditions.add("(p.numero_permiso LIKE ? OR v.placa LIKE ? OR c.nombre LIKE ?)");
            String term = "%" + search.trim() + "%";
            params.add(term);
            params.add(term);
            params.add(term);
        }

        String where = conditions.isEmpty() ? "" : " WHERE " + String.join(" AND ", conditions);

        return jdbcTemplate.queryForList("""
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
                """ + where + " ORDER BY p.created_at DESC", params.toArray())
                .stream().map(this::formatRow).toList();
    }

    private Map<String, Object> formatRow(Map<String, Object> row) {
        var output = new LinkedHashMap<String, Object>(row);
        output.replaceAll((key, value) -> {
            if (value instanceof Timestamp timestamp) {
                return timestamp.toLocalDateTime().toString().replace('T', ' ');
            }
            if (value instanceof Date date) {
                return date.toLocalDate().toString();
            }
            return value;
        });
        return output;
    }
}
