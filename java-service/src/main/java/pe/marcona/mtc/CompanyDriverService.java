package pe.marcona.mtc;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class CompanyDriverService {
    private static final Set<String> DRIVER_STATES = Set.of("activo", "inactivo", "suspendido");
    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public CompanyDriverService(JdbcTemplate jdbcTemplate, AuditService auditService) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    public Map<String, Object> listCompanies(Map<String, String> query) {
        int page = page(query.get("page"));
        int limit = page(query.get("limit"), 10);
        List<Object> args = new ArrayList<>();
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        String search = text(query.get("search"));
        String state = text(query.get("estado"));
        if (!search.isEmpty()) {
            where.append(" AND (c.nombre LIKE ? OR c.ruc LIKE ?)");
            args.add("%" + search + "%");
            args.add("%" + search + "%");
        }
        if (!state.isEmpty()) {
            where.append(" AND c.estado = ?");
            args.add(state);
        }
        Long total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM companies c" + where,
                Long.class, args.toArray());
        long active = count("SELECT COUNT(*) FROM companies WHERE estado = 'activo'");
        args.add(limit);
        args.add((long) (page - 1) * limit);
        List<Map<String, Object>> companies = jdbcTemplate.queryForList("""
                SELECT c.*, COUNT(v.id) AS flota
                FROM companies c
                LEFT JOIN vehicles v ON v.company_id = c.id AND v.estado = 'activo'
                """ + where + " GROUP BY c.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?", args.toArray())
                .stream().map(this::format).toList();
        long totalRows = total == null ? 0 : total;
        return Map.of("data", companies, "pagination", Map.of(
                "page", page, "limit", limit, "total", totalRows,
                "active_total", active, "pages", (totalRows + limit - 1) / limit));
    }

    public Map<String, Object> getCompany(long id) {
        return format(find("SELECT * FROM companies WHERE id = ?", id, "Empresa no encontrada"));
    }

    public Map<String, Object> createCompany(Map<String, Object> input, HttpServletRequest request, long actorId) {
        String name = requiredText(input, "nombre", 3, 150);
        String ruc = requiredText(input, "ruc", 11, 11);
        String phone = requiredText(input, "telefono", 7, 15);
        String email = requiredText(input, "email", 3, 100);
        String address = requiredText(input, "direccion", 5, 255);
        String contact = requiredText(input, "contacto", 3, 150);
        if (!ruc.matches("(10|15|17|20)\\d{9}")) {
            throw invalid("El RUC no es válido");
        }
        if (!phone.matches("\\d{9}")) {
            throw invalid("El teléfono no es válido");
        }
        if (!validEmail(email)) {
            throw invalid("El email no es válido");
        }
        if (exists("companies", "nombre", name, null)) {
            throw invalid("El nombre de la empresa ya existe");
        }
        if (exists("companies", "ruc", ruc, null)) {
            throw invalid("El RUC ya está registrado");
        }
        try {
            jdbcTemplate.update("""
                    INSERT INTO companies (nombre, ruc, telefono, email, direccion, contacto, estado)
                    VALUES (?, ?, ?, ?, ?, ?, 'activo')
                    """, name, ruc, phone, email, address, contact);
        } catch (DuplicateKeyException exception) {
            throw invalid("El nombre de la empresa o RUC ya está registrado");
        }
        Map<String, Object> company = find("SELECT * FROM companies WHERE ruc = ?", ruc, "Empresa no encontrada");
        long id = ((Number) company.get("id")).longValue();
        auditService.record(actorId, "crear", "empresa", id, "Empresa creada: " + name, request);
        return format(company);
    }

    public Map<String, Object> updateCompany(
            Map<String, Object> input, HttpServletRequest request, long actorId) {
        long id = positiveId(input.get("id"));
        find("SELECT * FROM companies WHERE id = ?", id, "Empresa no encontrada");
        String name = requiredText(input, "nombre", 3, 150);
        String ruc = requiredText(input, "ruc", 11, 11);
        String phone = requiredText(input, "telefono", 7, 15);
        String email = requiredText(input, "email", 3, 100);
        String address = requiredText(input, "direccion", 5, 255);
        String contact = requiredText(input, "contacto", 3, 150);
        String state = requiredText(input, "estado", 1, 20);
        if (!ruc.matches("(10|15|17|20)\\d{9}")) {
            throw invalid("El RUC no es válido");
        }
        if (!phone.matches("\\d{9}")) {
            throw invalid("El teléfono no es válido");
        }
        if (!validEmail(email)) {
            throw invalid("El email no es válido");
        }
        if (!Set.of("activo", "inactivo").contains(state)) {
            throw invalid("El valor de estado no es válido");
        }
        if (exists("companies", "nombre", name, id)) {
            throw invalid("El nombre de la empresa ya existe");
        }
        if (exists("companies", "ruc", ruc, id)) {
            throw invalid("El RUC ya está registrado");
        }
        try {
            jdbcTemplate.update("""
                    UPDATE companies
                    SET nombre = ?, ruc = ?, telefono = ?, email = ?, direccion = ?, contacto = ?, estado = ?
                    WHERE id = ?
                    """, name, ruc, phone, email, address, contact, state, id);
        } catch (DuplicateKeyException exception) {
            throw invalid("El nombre de la empresa o RUC ya está registrado");
        }
        auditService.record(actorId, "actualizar", "empresa", id, "Empresa actualizada: " + name, request);
        return format(find("SELECT * FROM companies WHERE id = ?", id, "Empresa no encontrada"));
    }

    public Map<String, Object> toggleCompany(long id, HttpServletRequest request, long actorId) {
        Map<String, Object> company = find("SELECT id, nombre, estado FROM companies WHERE id = ?",
                id, "Empresa no encontrada");
        String state = "activo".equals(company.get("estado")) ? "inactivo" : "activo";
        jdbcTemplate.update("UPDATE companies SET estado = ? WHERE id = ?", state, id);
        auditService.record(actorId, "cambio_estado", "empresa", id,
                "Estado de empresa '" + company.get("nombre") + "' cambiado a " + state, request);
        return Map.of("id", id, "estado", state);
    }

    public Map<String, Object> listDrivers(Map<String, String> query) {
        int page = page(query.get("page"));
        int limit = page(query.get("limit"), 10);
        List<Object> args = new ArrayList<>();
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        String search = text(query.get("search"));
        String companyId = text(query.get("company_id"));
        String state = text(query.get("estado"));
        boolean includeInactive = truthy(query.get("include_inactive"));
        if (!search.isEmpty()) {
            where.append(" AND (d.nombre_completo LIKE ? OR d.dni LIKE ? OR d.numero_licencia LIKE ?)");
            args.add("%" + search + "%");
            args.add("%" + search + "%");
            args.add("%" + search + "%");
        }
        if (!companyId.isEmpty()) {
            where.append(" AND d.company_id = ?");
            args.add(parseId(companyId));
        }
        if (!state.isEmpty()) {
            where.append(" AND d.estado = ?");
            args.add(state);
        }
        if (!includeInactive && state.isEmpty()) {
            where.append(" AND d.estado = 'activo'");
        }
        Long total = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM drivers d LEFT JOIN companies c ON d.company_id = c.id
                """ + where, Long.class, args.toArray());
        args.add(limit);
        args.add((long) (page - 1) * limit);
        List<Map<String, Object>> drivers = jdbcTemplate.queryForList("""
                SELECT d.*, c.nombre AS company_nombre
                FROM drivers d
                LEFT JOIN companies c ON d.company_id = c.id
                """ + where + " ORDER BY d.created_at DESC LIMIT ? OFFSET ?", args.toArray())
                .stream().map(this::format).toList();
        long totalRows = total == null ? 0 : total;
        return Map.of("data", drivers, "pagination", Map.of(
                "page", page, "limit", limit, "total", totalRows,
                "pages", (totalRows + limit - 1) / limit));
    }

    public Map<String, Object> createDriver(Map<String, Object> input, HttpServletRequest request, long actorId) {
        String name = requiredText(input, "nombre_completo", 3, 150);
        String dni = requiredText(input, "dni", 8, 8);
        String phone = requiredText(input, "telefono", 7, 15);
        String license = requiredText(input, "numero_licencia", 5, 15);
        LocalDate expiry = parseDate(requiredText(input, "fecha_vencimiento_licencia", 1, 20));
        if (!dni.matches("\\d{8}")) {
            throw invalid("El DNI debe tener 8 dígitos");
        }
        if (!phone.matches("\\d{9}")) {
            throw invalid("El teléfono no es válido");
        }
        if (!expiry.isAfter(LocalDate.now())) {
            throw invalid("La fecha debe ser posterior a hoy");
        }
        Long userId = nullableId(input.get("user_id"), "user_id");
        Long companyId = nullableId(input.get("company_id"), "company_id");
        if (exists("drivers", "dni", dni, null)) {
            throw invalid("El DNI ya está registrado");
        }
        if (exists("drivers", "numero_licencia", license, null)) {
            throw invalid("El número de licencia ya existe");
        }
        try {
            jdbcTemplate.update("""
                    INSERT INTO drivers
                        (user_id, company_id, nombre_completo, dni, telefono,
                         numero_licencia, fecha_vencimiento_licencia, estado)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'activo')
                    """, userId, companyId, name, dni, phone, license, Date.valueOf(expiry));
        } catch (DuplicateKeyException exception) {
            throw invalid("El DNI o número de licencia ya está registrado");
        }
        Map<String, Object> driver = find("SELECT * FROM drivers WHERE dni = ?", dni, "Chofer no encontrado");
        long id = ((Number) driver.get("id")).longValue();
        auditService.record(actorId, "crear", "chofer", id, "Chofer creado: " + name, request);
        return format(driver);
    }

    public Map<String, Object> updateDriver(
            Map<String, Object> input, HttpServletRequest request, long actorId) {
        long id = positiveId(input.get("id"));
        Map<String, Object> current = find("SELECT * FROM drivers WHERE id = ?", id, "Chofer no encontrado");
        List<String> assignments = new ArrayList<>();
        List<Object> values = new ArrayList<>();
        for (String field : List.of("user_id", "company_id")) {
            if (input.containsKey(field)) {
                assignments.add(field + " = ?");
                values.add(nullableId(input.get(field), field));
            }
        }
        for (String field : List.of("nombre_completo", "dni", "telefono", "numero_licencia",
                "fecha_vencimiento_licencia", "estado")) {
            String value = text(input.get(field));
            if (value.isEmpty()) {
                continue;
            }
            validateDriverField(field, value);
            if (Set.of("dni", "numero_licencia").contains(field)
                    && exists("drivers", field, value, id)) {
                throw invalid("dni".equals(field) ? "El DNI ya está registrado" : "El número de licencia ya existe");
            }
            assignments.add(field + " = ?");
            values.add(value);
        }
        if (assignments.isEmpty()) {
            throw invalid("No hay campos para actualizar");
        }
        assignments.add("updated_at = NOW()");
        values.add(id);
        try {
            jdbcTemplate.update("UPDATE drivers SET " + String.join(", ", assignments) + " WHERE id = ?",
                    values.toArray());
        } catch (DuplicateKeyException exception) {
            throw invalid("El DNI o número de licencia ya está registrado");
        }
        auditService.record(actorId, "actualizar", "chofer", id, "Chofer actualizado", request);
        return format(find("SELECT * FROM drivers WHERE id = ?", id, "Chofer no encontrado"));
    }

    private Map<String, Object> find(String sql, Object id, String missingMessage) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, id);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, missingMessage);
        }
        return rows.get(0);
    }

    private boolean exists(String table, String column, Object value, Long excludedId) {
        if (!Set.of("companies", "drivers").contains(table)
                || !Set.of("nombre", "ruc", "dni", "numero_licencia").contains(column)) {
            throw new IllegalArgumentException("Unsupported uniqueness check");
        }
        Integer count = excludedId == null
                ? jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE " + column + " = ?",
                        Integer.class, value)
                : jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table
                                + " WHERE " + column + " = ? AND id <> ?", Integer.class, value, excludedId);
        return count != null && count > 0;
    }

    private Map<String, Object> format(Map<String, Object> row) {
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

    private void validateDriverField(String field, String value) {
        switch (field) {
            case "nombre_completo" -> validateLength(value, 3, 150, field);
            case "dni" -> {
                if (!value.matches("\\d{8}")) throw invalid("El DNI debe tener 8 dígitos");
            }
            case "telefono" -> {
                if (!value.matches("\\d{9}")) throw invalid("El teléfono no es válido");
            }
            case "numero_licencia" -> validateLength(value, 5, 15, field);
            case "fecha_vencimiento_licencia" -> parseDate(value);
            case "estado" -> {
                if (!DRIVER_STATES.contains(value)) throw invalid("Estado inválido");
            }
            default -> throw new IllegalArgumentException("Unsupported driver field");
        }
    }

    private String requiredText(Map<String, Object> input, String field, int min, int max) {
        String value = text(input.get(field));
        validateLength(value, min, max, field);
        return value;
    }

    private void validateLength(String value, int min, int max, String field) {
        if (value.length() < min || value.length() > max) {
            throw invalid("Validación fallida: " + field + " debe tener entre " + min + " y " + max + " caracteres");
        }
    }

    private LocalDate parseDate(String value) {
        try {
            return LocalDate.parse(value);
        } catch (RuntimeException exception) {
            throw invalid("La fecha fecha_vencimiento_licencia no es válida");
        }
    }

    private Long nullableId(Object value, String field) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        long id = parseId(value.toString());
        if (id < 1) {
            throw invalid("El campo " + field + " debe ser numérico");
        }
        return id;
    }

    private long positiveId(Object value) {
        if (value == null || value.toString().isBlank()) {
            throw invalid("ID inválido");
        }
        long id = parseId(value.toString());
        if (id < 1) {
            throw invalid("ID inválido");
        }
        return id;
    }

    private long parseId(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException exception) {
            throw invalid("El identificador debe ser numérico");
        }
    }

    private String text(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private boolean truthy(String value) {
        return value != null && !value.isBlank() && !"0".equals(value);
    }

    private boolean validEmail(String email) {
        return email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    }

    private int page(String value) {
        return page(value, 1);
    }

    private int page(String value, int fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return Math.max(1, Integer.parseInt(value));
        } catch (NumberFormatException exception) {
            throw invalid("Parámetro de paginación inválido");
        }
    }

    private long count(String sql) {
        Long count = jdbcTemplate.queryForObject(sql, Long.class);
        return count == null ? 0 : count;
    }

    private ApiException invalid(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }
}
