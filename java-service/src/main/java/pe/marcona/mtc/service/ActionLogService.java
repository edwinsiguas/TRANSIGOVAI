package pe.marcona.mtc.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ActionLogService {
    private final JdbcTemplate jdbcTemplate;

    public ActionLogService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> listLogs(Map<String, String> query) {
        int page = positiveInt(query.get("page"), 1);
        int limit = positiveInt(query.get("limit"), 10);
        long offset = (long) (page - 1) * limit;

        List<String> conditions = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        String userId = query.get("user_id");
        if (userId != null && !userId.isBlank()) {
            try {
                params.add(Long.parseLong(userId.trim()));
                conditions.add("l.user_id = ?");
            } catch (NumberFormatException ignored) { }
        }

        String accion = query.get("accion");
        if (accion != null && !accion.isBlank()) {
            conditions.add("l.accion = ?");
            params.add(accion.trim());
        }

        String entidad = query.get("entidad");
        if (entidad != null && !entidad.isBlank()) {
            conditions.add("l.entidad = ?");
            params.add(entidad.trim());
        }

        String where = conditions.isEmpty() ? "" : " WHERE " + String.join(" AND ", conditions);

        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM action_logs l" + where, Long.class, params.toArray());

        params.add(limit);
        params.add(offset);

        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT l.id, l.user_id, l.accion, l.entidad, l.entidad_id,
                       l.descripcion, l.ip_address, l.created_at,
                       COALESCE(u.nombre, 'Sistema') AS usuario_nombre,
                       COALESCE(u.email, 'sistema@marcona.gob.pe') AS email
                FROM action_logs l
                LEFT JOIN users u ON l.user_id = u.id
                """ + where + " ORDER BY l.created_at DESC LIMIT ? OFFSET ?", params.toArray())
                .stream().map(this::formatDates).toList();

        long count = total == null ? 0 : total;
        long pages = count == 0 ? 0 : (count + limit - 1) / limit;

        return Map.of(
                "data", rows,
                "pagination", Map.of(
                        "page", page,
                        "limit", limit,
                        "total", count,
                        "pages", pages));
    }

    private Map<String, Object> formatDates(Map<String, Object> row) {
        var output = new LinkedHashMap<String, Object>(row);
        Object createdAt = output.get("created_at");
        if (createdAt instanceof Timestamp ts) {
            output.put("created_at", ts.toLocalDateTime().toString().replace('T', ' '));
        }
        return output;
    }

    private int positiveInt(String val, int fallback) {
        if (val == null || val.isBlank()) return fallback;
        try {
            return Math.max(1, Integer.parseInt(val));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }
}
