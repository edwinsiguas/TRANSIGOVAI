package pe.marcona.mtc.service;

import pe.marcona.mtc.exception.ApiException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;

import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class VerificationService {
    private static final Set<String> SEARCH_TYPES = Set.of("placa", "dni", "permiso");

    private final JdbcTemplate jdbcTemplate;
    private final CirculationService circulationService;
    private final RateLimitService rateLimitService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public VerificationService(
            JdbcTemplate jdbcTemplate,
            CirculationService circulationService,
            RateLimitService rateLimitService,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.circulationService = circulationService;
        this.rateLimitService = rateLimitService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> create(
            Map<String, Object> input, HttpServletRequest request, Map<String, Object> user) {
        rateLimitService.check("permit_verify", request.getRemoteAddr(), 60, 60);
        String type = text(input, "search_type");
        String query = text(input, "search_query").toUpperCase();
        if (!SEARCH_TYPES.contains(type)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Tipo de búsqueda inválido. Use: placa, dni o permiso");
        }
        if (query.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El término de búsqueda es requerido");
        }

        String queryKey = switch (type) {
            case "placa" -> "placa";
            case "dni" -> "dni";
            default -> "numero_permiso";
        };
        Map<String, Object> result = circulationService.validate(Map.of(queryKey, query));
        boolean allowed = Boolean.TRUE.equals(result.get("puede_circular"));
        Object data = result.get("data");
        List<?> reasons = result.get("bloqueos") instanceof List<?> list ? list : List.of();
        long userId = ((Number) user.get("id")).longValue();
        String ip = clientIp(request);
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                    INSERT INTO verifications
                        (user_id, search_type, search_query, resultado, motivos, vehicle_data, ip_address)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, userId);
            statement.setString(2, type);
            statement.setString(3, query);
            statement.setString(4, allowed ? "autorizado" : "rechazado");
            statement.setString(5, toJson(reasons));
            statement.setString(6, data == null ? null : toJson(data));
            statement.setString(7, ip);
            return statement;
        }, keyHolder);
        Number verificationId = keyHolder.getKey();
        if (verificationId == null) {
            throw new IllegalStateException("Verification insert did not return its generated ID");
        }
        auditService.record(userId, "registrar_verificacion", "verificacion",
                verificationId.longValue(),
                "Verificación de " + type + ": " + (allowed ? "autorizado" : "rechazado"), request);
        return result;
    }

    public Map<String, Object> list(Map<String, String> query, Map<String, Object> user) {
        int page = parsePage(query.get("page"), 1);
        int limit = Math.min(50, parsePage(query.get("limit"), 20));
        List<Object> args = new ArrayList<>();
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        boolean onlyMine = "fiscalizador".equals(user.get("role"));
        if (onlyMine) {
            where.append(" AND v.user_id = ?");
            args.add(user.get("id"));
        } else if (query.get("user_id") != null && !query.get("user_id").isBlank()) {
            where.append(" AND v.user_id = ?");
            args.add(parseId(query.get("user_id")));
        }
        String result = query.get("resultado");
        if (result != null && Set.of("autorizado", "rechazado").contains(result)) {
            where.append(" AND v.resultado = ?");
            args.add(result);
        }
        addDateFilter(where, args, query.get("date_from"), ">=");
        addDateFilter(where, args, query.get("date_to"), "<=");

        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM verifications v" + where, Long.class, args.toArray());
        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(limit);
        pageArgs.add((long) (page - 1) * limit);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT v.id, v.search_type, v.search_query, v.resultado, v.motivos,
                       v.vehicle_data, v.ip_address, v.created_at,
                       u.nombre AS verificador_nombre, u.role AS verificador_role
                FROM verifications v
                JOIN users u ON v.user_id = u.id
                """ + where + " ORDER BY v.created_at DESC LIMIT ? OFFSET ?", pageArgs.toArray());
        List<Map<String, Object>> data = rows.stream().map(this::format).toList();

        long totalRows = total == null ? 0 : total;
        int pages = totalRows == 0 ? 1 : (int) ((totalRows + limit - 1) / limit);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("data", data);
        response.put("today_stats", onlyMine ? todayStats(((Number) user.get("id")).longValue()) : null);
        response.put("pagination", Map.of(
                "page", page, "limit", limit, "total", totalRows, "pages", pages));
        return response;
    }

    private Map<String, Object> todayStats(long userId) {
        return jdbcTemplate.queryForMap("""
                SELECT COUNT(*) AS total,
                       COALESCE(SUM(resultado = 'autorizado'), 0) AS autorizados,
                       COALESCE(SUM(resultado = 'rechazado'), 0) AS rechazados
                FROM verifications
                WHERE user_id = ? AND DATE(created_at) = CURDATE()
                """, userId);
    }

    private Map<String, Object> format(Map<String, Object> row) {
        var output = new LinkedHashMap<String, Object>(row);
        output.put("motivos", parseJson(row.get("motivos"), List.of()));
        output.put("vehicle_data", parseJson(row.get("vehicle_data"), null));
        Object createdAt = row.get("created_at");
        if (createdAt instanceof java.sql.Timestamp timestamp) {
            output.put("created_at", timestamp.toLocalDateTime().toString().replace('T', ' '));
        }
        return output;
    }

    private Object parseJson(Object value, Object fallback) {
        if (value == null) return fallback;
        try {
            return objectMapper.readValue(value.toString(), Object.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Stored verification JSON is invalid", exception);
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize verification data", exception);
        }
    }

    private void addDateFilter(StringBuilder where, List<Object> args, String date, String operator) {
        if (date == null || date.isBlank()) return;
        try {
            java.time.LocalDate.parse(date);
        } catch (java.time.format.DateTimeParseException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Fecha de filtro no válida");
        }
        where.append(" AND DATE(v.created_at) ").append(operator).append(" ?");
        args.add(date);
    }

    private int parsePage(String value, int fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return Math.max(1, Integer.parseInt(value));
        } catch (NumberFormatException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Parámetro de paginación inválido");
        }
    }

    private long parseId(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El usuario debe ser numérico");
        }
    }

    private String clientIp(HttpServletRequest request) {
        for (String header : List.of("CF-Connecting-IP", "X-Real-IP", "X-Forwarded-For")) {
            String value = request.getHeader(header);
            if (value != null && !value.isBlank()) {
                return value.split(",", 2)[0].trim();
            }
        }
        return request.getRemoteAddr() == null ? "0.0.0.0" : request.getRemoteAddr();
    }

    private String text(Map<String, Object> input, String key) {
        Object value = input.get(key);
        return value == null ? "" : value.toString().trim();
    }
}
