package pe.marcona.mtc;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class AssignmentService {
    private static final Set<String> TYPES = Set.of("propietario", "alquiler", "reemplazo_temporal");

    private final JdbcTemplate jdbcTemplate;

    public AssignmentService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> list(Map<String, String> query) {
        int page = positiveInt(query.get("page"), 1);
        int limit = positiveInt(query.get("limit"), 10);
        List<String> conditions = new ArrayList<>();
        List<Object> parameters = new ArrayList<>();
        addFilter(query, "vehicle_id", "va.vehicle_id", conditions, parameters);
        addFilter(query, "driver_id", "va.driver_id", conditions, parameters);
        addFilter(query, "tipo", "va.tipo", conditions, parameters);
        String active = query.get("activo");
        if (active == null || active.isBlank()) {
            conditions.add("va.activo = 1");
        } else {
            conditions.add("va.activo = ?");
            parameters.add(parseInt(active, "activo"));
        }
        String where = conditions.isEmpty() ? "" : " WHERE " + String.join(" AND ", conditions);
        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM vehicle_assignments va" + where, Long.class, parameters.toArray());
        parameters.add(limit);
        parameters.add((long) (page - 1) * limit);
        List<Map<String, Object>> data = jdbcTemplate.queryForList("""
                SELECT va.*,
                       d.nombre_completo, d.dni, d.numero_licencia,
                       d.fecha_vencimiento_licencia, d.estado AS estado_conductor,
                       v.placa, v.marca, v.modelo, v.estado AS estado_vehiculo,
                       c.nombre AS empresa
                FROM vehicle_assignments va
                JOIN drivers d ON va.driver_id = d.id
                JOIN vehicles v ON va.vehicle_id = v.id
                LEFT JOIN companies c ON v.company_id = c.id
                """ + where + " ORDER BY va.created_at DESC LIMIT ? OFFSET ?", parameters.toArray())
                .stream().map(this::formatValues).toList();
        long count = total == null ? 0 : total;
        return Map.of("data", data, "pagination", Map.of(
                "page", page, "limit", limit, "total", count,
                "pages", count == 0 ? 0 : (count + limit - 1) / limit));
    }

    @Transactional
    public Map<String, Object> assign(Map<String, Object> input, long actorId) {
        long vehicleId = positiveLong(input.get("vehicle_id"), "vehicle_id y driver_id son obligatorios");
        long driverId = positiveLong(input.get("driver_id"), "vehicle_id y driver_id son obligatorios");
        String type = text(input.getOrDefault("tipo", "propietario"));
        if (!TYPES.contains(type)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Tipo de asignación inválido. Use: propietario, alquiler, reemplazo_temporal");
        }
        String ownerName = optionalText(input.get("propietario_nombre"));
        String ownerDni = optionalText(input.get("propietario_dni"));
        if ("alquiler".equals(type)) {
            if (ownerName == null || ownerName.length() < 3) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "propietario_nombre es obligatorio para tipo alquiler");
            }
            if (ownerDni == null || !ownerDni.matches("\\d{8}")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "propietario_dni debe tener 8 dígitos");
            }
        }

        List<Map<String, Object>> vehicle = jdbcTemplate.queryForList(
                "SELECT id, estado FROM vehicles WHERE id = ?", vehicleId);
        if (vehicle.isEmpty() || "inactivo".equals(vehicle.get(0).get("estado"))) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Vehículo no encontrado o inactivo");
        }
        List<Map<String, Object>> driver = jdbcTemplate.queryForList("""
                SELECT id, estado, fecha_vencimiento_licencia
                FROM drivers WHERE id = ?
                """, driverId);
        if (driver.isEmpty() || !"activo".equals(driver.get(0).get("estado"))) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Conductor no encontrado o no activo");
        }
        LocalDate expiry = asLocalDate(driver.get(0).get("fecha_vencimiento_licencia"));
        if (expiry.isBefore(LocalDate.now())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "La licencia de conducir del conductor está vencida");
        }

        jdbcTemplate.update("""
                UPDATE vehicle_assignments
                SET activo = 0, fecha_fin = CURDATE()
                WHERE vehicle_id = ? AND activo = 1
                """, vehicleId);
        String endDate = optionalText(input.get("fecha_fin"));
        String notes = optionalText(input.get("notas"));
        jdbcTemplate.update("""
                INSERT INTO vehicle_assignments
                    (vehicle_id, driver_id, tipo, propietario_nombre, propietario_dni,
                     fecha_inicio, fecha_fin, activo, notas, created_by)
                VALUES (?, ?, ?, ?, ?, CURDATE(), ?, 1, ?, ?)
                """, vehicleId, driverId, type, ownerName, ownerDni, endDate, notes, actorId);
        Long id = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        if (id == null) {
            throw new IllegalStateException("No se pudo recuperar la asignación recién creada");
        }
        return getById(id);
    }

    public Map<String, Object> activeByVehicle(long vehicleId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT va.*, d.nombre_completo, d.dni, d.telefono, d.numero_licencia,
                       d.categoria_licencia, d.fecha_vencimiento_licencia,
                       d.estado AS estado_conductor, v.placa, v.marca, v.modelo, v.color,
                       v.estado AS estado_vehiculo, v.tipo_propiedad, c.nombre AS empresa
                FROM vehicle_assignments va
                JOIN drivers d ON va.driver_id = d.id
                JOIN vehicles v ON va.vehicle_id = v.id
                LEFT JOIN companies c ON v.company_id = c.id
                WHERE va.vehicle_id = ? AND va.activo = 1
                """, vehicleId);
        return rows.isEmpty() ? null : formatValues(rows.get(0));
    }

    public Map<String, Object> activeByDriver(long driverId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT va.*, v.placa, v.marca, v.modelo, v.color,
                       v.estado AS estado_vehiculo, c.nombre AS empresa
                FROM vehicle_assignments va
                JOIN vehicles v ON va.vehicle_id = v.id
                LEFT JOIN companies c ON v.company_id = c.id
                WHERE va.driver_id = ? AND va.activo = 1
                """, driverId);
        return rows.isEmpty() ? null : formatValues(rows.get(0));
    }

    public List<Map<String, Object>> history(long vehicleId) {
        return jdbcTemplate.queryForList("""
                SELECT va.*, d.nombre_completo, d.dni, d.numero_licencia
                FROM vehicle_assignments va
                JOIN drivers d ON va.driver_id = d.id
                WHERE va.vehicle_id = ?
                ORDER BY va.created_at DESC
                """, vehicleId).stream().map(this::formatValues).toList();
    }

    @Transactional
    public boolean unassign(long vehicleId) {
        return jdbcTemplate.update("""
                UPDATE vehicle_assignments
                SET activo = 0, fecha_fin = CURDATE()
                WHERE vehicle_id = ? AND activo = 1
                """, vehicleId) > 0;
    }

    private Map<String, Object> getById(long id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT va.*, d.nombre_completo, d.dni, d.numero_licencia,
                       d.fecha_vencimiento_licencia, v.placa, v.marca, v.modelo,
                       c.nombre AS empresa
                FROM vehicle_assignments va
                JOIN drivers d ON va.driver_id = d.id
                JOIN vehicles v ON va.vehicle_id = v.id
                LEFT JOIN companies c ON v.company_id = c.id
                WHERE va.id = ?
                """, id);
        if (rows.isEmpty()) {
            throw new IllegalStateException("Asignación " + id + " no encontrada");
        }
        return formatValues(rows.get(0));
    }

    private void addFilter(
            Map<String, String> query,
            String key,
            String column,
            List<String> conditions,
            List<Object> parameters) {
        String value = query.get(key);
        if (value != null && !value.isBlank()) {
            conditions.add(column + " = ?");
            parameters.add(key.endsWith("_id") ? parseLong(value, key) : value.trim());
        }
    }

    private Map<String, Object> formatValues(Map<String, Object> row) {
        var result = new LinkedHashMap<String, Object>(row);
        result.replaceAll((key, value) -> {
            if (value instanceof Timestamp timestamp) {
                return timestamp.toLocalDateTime().toString().replace('T', ' ');
            }
            if (value instanceof Date date) {
                return date.toLocalDate().toString();
            }
            if (value instanceof Boolean bool && "activo".equals(key)) {
                return bool ? 1 : 0;
            }
            return value;
        });
        return result;
    }

    private LocalDate asLocalDate(Object value) {
        if (value instanceof Date date) {
            return date.toLocalDate();
        }
        if (value instanceof LocalDate date) {
            return date;
        }
        return LocalDate.parse(String.valueOf(value));
    }

    private int positiveInt(String value, int fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        int parsed = parseInt(value, "paginación");
        return Math.max(1, parsed);
    }

    private int parseInt(String value, String name) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Parámetro " + name + " inválido");
        }
    }

    private long positiveLong(Object value, String message) {
        long parsed = parseLong(value, "id");
        if (parsed < 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, message);
        }
        return parsed;
    }

    private long parseLong(Object value, String name) {
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Parámetro " + name + " inválido");
        }
    }

    private String text(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private String optionalText(Object value) {
        String text = text(value);
        return text.isEmpty() ? null : text;
    }
}
