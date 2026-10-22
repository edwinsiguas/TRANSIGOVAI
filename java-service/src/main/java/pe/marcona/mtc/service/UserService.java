package pe.marcona.mtc.service;

import pe.marcona.mtc.exception.ApiException;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class UserService {
    private static final Set<String> ROLES = Set.of("admin", "operador", "fiscalizador");
    private static final Set<String> STATES = Set.of("activo", "inactivo");
    private static final DateTimeFormatter DATABASE_TIMESTAMP =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final JdbcTemplate jdbcTemplate;
    private final AuthService authService;
    private final AuditService auditService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);

    public UserService(JdbcTemplate jdbcTemplate, AuthService authService, AuditService auditService) {
        this.jdbcTemplate = jdbcTemplate;
        this.authService = authService;
        this.auditService = auditService;
    }

    public Map<String, Object> list(Map<String, String> query, HttpServletRequest request) {
        authService.requireUser(request, "admin");
        int page = positiveInt(query.get("page"), 1);
        int limit = positiveInt(query.get("limit"), 10);
        String search = blankToNull(query.get("search"));
        String role = blankToNull(query.get("role"));
        String state = blankToNull(query.get("estado"));
        boolean includeInactive = truthy(query.get("include_inactive"));

        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        List<Object> parameters = new ArrayList<>();
        if (search != null) {
            where.append(" AND (email LIKE ? OR nombre LIKE ?)");
            parameters.add("%" + search + "%");
            parameters.add("%" + search + "%");
        }
        if (role != null) {
            where.append(" AND role = ?");
            parameters.add(role);
        }
        if (state != null) {
            where.append(" AND estado = ?");
            parameters.add(state);
        }
        if (!includeInactive && state == null) {
            where.append(" AND is_active = 1");
        }

        Long total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users" + where, Long.class,
                parameters.toArray());
        long offset = (long) (page - 1) * limit;
        parameters.add(limit);
        parameters.add(offset);
        List<Map<String, Object>> users = jdbcTemplate.queryForList("""
                SELECT id, email, nombre, role, estado, is_active, created_at
                FROM users
                """ + where + " ORDER BY created_at DESC LIMIT ? OFFSET ?", parameters.toArray())
                .stream().map(this::stringifyTimestamps).toList();

        long totalRows = total == null ? 0 : total;
        long pages = (totalRows + limit - 1) / limit;
        return Map.of(
                "data", users,
                "pagination", Map.of("page", page, "limit", limit, "total", totalRows, "pages", pages));
    }

    public Map<String, Object> create(Map<String, Object> input, HttpServletRequest request) {
        Map<String, Object> actor = authService.requireUser(request, "admin");
        String email = text(input, "email");
        String password = text(input, "password");
        String name = text(input, "nombre");
        String role = text(input, "role");

        if (email.isBlank() || !validEmail(email)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Validación fallida: email no es válido");
        }
        if (password.length() < 8) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Validación fallida: la contraseña debe tener al menos 8 caracteres");
        }
        if (name.length() < 3 || name.length() > 150) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Validación fallida: nombre debe tener entre 3 y 150 caracteres");
        }
        if (!ROLES.contains(role)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Validación fallida: rol no es válido");
        }
        if (emailExists(email, null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El email ya está registrado");
        }

        try {
            jdbcTemplate.update("""
                    INSERT INTO users (email, password, nombre, role, estado, is_active)
                    VALUES (?, ?, ?, ?, 'activo', 1)
                    """, email, passwordEncoder.encode(password), name, role);
        } catch (DuplicateKeyException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El email ya está registrado");
        }
        Map<String, Object> created = jdbcTemplate.queryForMap("""
                SELECT id, email, nombre, role, estado, is_active, created_at
                FROM users WHERE email = ?
                """, email);
        long userId = ((Number) created.get("id")).longValue();
        long actorId = ((Number) actor.get("id")).longValue();
        auditService.record(actorId, "crear", "usuario", userId, "Usuario creado: " + email, request);
        return stringifyTimestamps(created);
    }

    public Map<String, Object> update(Map<String, Object> input, HttpServletRequest request) {
        Map<String, Object> actor = authService.requireUser(request, null);
        Long userId = parseId(input == null ? null : input.get("id"));
        if (userId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ID inválido");
        }
        long actorId = ((Number) actor.get("id")).longValue();
        boolean isAdmin = "admin".equals(actor.get("role"));
        if (actorId != userId && !isAdmin) {
            throw new ApiException(HttpStatus.FORBIDDEN, "No tienes permiso para editar este usuario");
        }

        List<Map<String, Object>> existing = jdbcTemplate.queryForList("SELECT id FROM users WHERE id = ?", userId);
        if (existing.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Usuario no encontrado");
        }

        List<String> changes = new ArrayList<>();
        List<Object> values = new ArrayList<>();
        String email = optionalText(input, "email");
        if (email != null) {
            if (!validEmail(email)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Email inválido");
            }
            if (emailExists(email, userId)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "El email ya está registrado");
            }
            changes.add("email = ?");
            values.add(email);
        }

        String name = optionalText(input, "nombre");
        if (name != null) {
            changes.add("nombre = ?");
            values.add(name);
        }

        String password = optionalText(input, "password");
        if (password != null) {
            if (password.length() < 8) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "La contraseña debe tener al menos 8 caracteres");
            }
            changes.add("password = ?");
            values.add(passwordEncoder.encode(password));
        }

        if (isAdmin) {
            String role = optionalText(input, "role");
            if (role != null) {
                if (!ROLES.contains(role)) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Rol inválido");
                }
                changes.add("role = ?");
                values.add(role);
            }
            Boolean active = parseBoolean(optionalValue(input, "is_active"));
            if (active != null) {
                changes.add("is_active = ?");
                values.add(active ? 1 : 0);
            }
            String state = optionalText(input, "estado");
            if (state != null) {
                if (!STATES.contains(state)) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Estado inválido");
                }
                changes.add("estado = ?");
                values.add(state);
            }
        }

        if (changes.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No hay campos para actualizar");
        }
        changes.add("updated_at = NOW()");
        values.add(userId);
        try {
            jdbcTemplate.update("UPDATE users SET " + String.join(", ", changes) + " WHERE id = ?",
                    values.toArray());
        } catch (DuplicateKeyException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El email ya está registrado");
        }

        auditService.record(actorId, "actualizar", "usuario", userId, "Credenciales actualizadas", request);
        return stringifyTimestamps(jdbcTemplate.queryForMap("""
                SELECT id, email, nombre, role, estado, is_active, created_at, updated_at
                FROM users WHERE id = ?
                """, userId));
    }

    private boolean emailExists(String email, Long excludedId) {
        Integer count = excludedId == null
                ? jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users WHERE email = ?", Integer.class, email)
                : jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users WHERE email = ? AND id <> ?",
                        Integer.class, email, excludedId);
        return count != null && count > 0;
    }

    private Map<String, Object> stringifyTimestamps(Map<String, Object> row) {
        var result = new LinkedHashMap<String, Object>(row);
        result.replaceAll((key, value) -> {
            if (value instanceof Timestamp timestamp) {
                return timestamp.toLocalDateTime().format(DATABASE_TIMESTAMP);
            }
            if (value instanceof LocalDateTime dateTime) {
                return dateTime.format(DATABASE_TIMESTAMP);
            }
            return value;
        });
        Object active = result.get("is_active");
        if (active instanceof Boolean bool) {
            result.put("is_active", bool ? 1 : 0);
        }
        return result;
    }

    private int positiveInt(String value, int fallback) {
        try {
            return value == null ? fallback : Math.max(1, Integer.parseInt(value));
        } catch (NumberFormatException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Parámetro de paginación inválido");
        }
    }

    private boolean truthy(String value) {
        return value != null && !value.isBlank() && !"0".equals(value);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String text(Map<String, Object> input, String key) {
        Object value = input == null ? null : input.get(key);
        return value == null ? "" : value.toString().trim();
    }

    private String optionalText(Map<String, Object> input, String key) {
        Object value = optionalValue(input, key);
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }

    private Object optionalValue(Map<String, Object> input, String key) {
        return input == null ? null : input.get(key);
    }

    private Long parseId(Object value) {
        if (value == null) {
            return null;
        }
        try {
            long id = Long.parseLong(value.toString());
            return id > 0 ? id : null;
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private Boolean parseBoolean(Object value) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        if (value instanceof Boolean bool) {
            return bool;
        }
        return switch (value.toString().toLowerCase(Locale.ROOT)) {
            case "1", "true", "yes", "on" -> true;
            case "0", "false", "no", "off" -> false;
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "is_active inválido");
        };
    }

    private boolean validEmail(String email) {
        return email.length() <= 100 && email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    }
}
