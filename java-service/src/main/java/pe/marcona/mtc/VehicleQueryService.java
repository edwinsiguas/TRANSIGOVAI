package pe.marcona.mtc;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class VehicleQueryService {
    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;
    private final String apiUrl;

    public VehicleQueryService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService,
            @org.springframework.beans.factory.annotation.Value("${app.api-url:http://localhost/api}") String apiUrl) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
        this.apiUrl = apiUrl.replaceAll("/+$", "");
    }

    public Map<String, Object> list(Map<String, String> query) {
        int page = page(query.get("page"), 1);
        int limit = page(query.get("limit"), 10);
        List<Object> args = new ArrayList<>();
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        String search = text(query.get("search"));
        String companyId = text(query.get("company_id"));
        String driverId = text(query.get("driver_id"));
        String state = text(query.get("estado"));
        if (!search.isEmpty()) {
            where.append(" AND (v.placa LIKE ? OR v.marca LIKE ? OR v.modelo LIKE ?)");
            args.add("%" + search + "%");
            args.add("%" + search + "%");
            args.add("%" + search + "%");
        }
        if (!companyId.isEmpty()) {
            where.append(" AND v.company_id = ?");
            args.add(parseId(companyId));
        }
        if (!driverId.isEmpty()) {
            where.append("""
                     AND EXISTS (
                         SELECT 1 FROM vehicle_assignments filter_assignment
                         WHERE filter_assignment.vehicle_id = v.id
                           AND filter_assignment.driver_id = ? AND filter_assignment.activo = 1
                     )
                    """);
            args.add(parseId(driverId));
        }
        if (!state.isEmpty()) {
            where.append(" AND v.estado = ?");
            args.add(state);
        } else if (!truthy(query.get("include_inactive"))) {
            where.append(" AND v.estado = 'activo'");
        }

        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM vehicles v" + where, Long.class, args.toArray());
        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(limit);
        pageArgs.add((long) (page - 1) * limit);
        List<Map<String, Object>> vehicles = jdbcTemplate.queryForList("""
                SELECT v.*,
                       d.nombre_completo AS driver_nombre,
                       d.numero_licencia AS driver_licencia,
                       d.estado AS driver_estado,
                       va.tipo AS assignment_tipo,
                       va.id AS assignment_id,
                       c.nombre AS company_nombre,
                       (SELECT COUNT(*) FROM vehicle_images vi WHERE vi.vehicle_id = v.id) AS images_count,
                       (SELECT vi.file_path
                        FROM vehicle_images vi
                        WHERE vi.vehicle_id = v.id
                        ORDER BY vi.sort_order ASC, vi.id ASC
                        LIMIT 1) AS primary_image
                FROM vehicles v
                LEFT JOIN vehicle_assignments va ON va.vehicle_id = v.id AND va.activo = 1
                LEFT JOIN drivers d ON va.driver_id = d.id
                LEFT JOIN companies c ON v.company_id = c.id
                """ + where + " ORDER BY v.created_at DESC LIMIT ? OFFSET ?", pageArgs.toArray())
                .stream().map(this::formatImage).toList();
        long totalRows = total == null ? 0 : total;
        return Map.of("data", vehicles, "pagination", Map.of(
                "page", page, "limit", limit, "total", totalRows,
                "pages", (totalRows + limit - 1) / limit));
    }

    public Map<String, Object> toggleStatus(long id, HttpServletRequest request, long actorId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, placa, estado FROM vehicles WHERE id = ?", id);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Vehículo no encontrado");
        }
        Map<String, Object> vehicle = rows.get(0);
        String newState = "activo".equals(vehicle.get("estado")) ? "inactivo" : "activo";
        jdbcTemplate.update("UPDATE vehicles SET estado = ? WHERE id = ?", newState, id);
        auditService.record(actorId, "cambio_estado", "vehiculo", id,
                "Estado de vehículo '" + vehicle.get("placa") + "' cambiado a " + newState, request);
        return Map.of("id", id, "estado", newState);
    }

    private Map<String, Object> formatImage(Map<String, Object> row) {
        var output = new LinkedHashMap<String, Object>(row);
        Object image = output.get("primary_image");
        if (image != null && !image.toString().isBlank()) {
            output.put("primary_image", apiUrl + "/" + image.toString().replaceFirst("^/+", ""));
        }
        return output;
    }

    private int page(String value, int fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return Math.max(1, Integer.parseInt(value));
        } catch (NumberFormatException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Parámetro de paginación inválido");
        }
    }

    private long parseId(String value) {
        try {
            long id = Long.parseLong(value);
            if (id > 0) return id;
        } catch (NumberFormatException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El identificador debe ser numérico");
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "El identificador debe ser numérico");
    }

    private String text(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean truthy(String value) {
        return value != null && !value.isBlank() && !"0".equals(value);
    }
}
