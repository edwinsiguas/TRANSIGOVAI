package pe.marcona.mtc.service;

import pe.marcona.mtc.exception.ApiException;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class AuthService {
    private final JdbcTemplate jdbcTemplate;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);
    private final LegacyTokenService tokenService;
    private final RateLimitService rateLimitService;
    private final AuditService auditService;

    public AuthService(
            JdbcTemplate jdbcTemplate,
            LegacyTokenService tokenService,
            RateLimitService rateLimitService,
            AuditService auditService) {
        this.jdbcTemplate = jdbcTemplate;
        this.tokenService = tokenService;
        this.rateLimitService = rateLimitService;
        this.auditService = auditService;
    }

    public Map<String, Object> login(Map<String, Object> input, HttpServletRequest request) {
        rateLimitService.check("login", request.getRemoteAddr(), 5, 900);
        String email = text(input, "email");
        String password = text(input, "password");
        if (email.isBlank() || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || password.length() < 6) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Validación fallida: email o contraseña inválidos");
        }

        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT id, email, password, nombre, role, estado, is_active
                FROM users
                WHERE email = ? AND estado = ? AND is_active = 1
                """, email, "activo");
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Email o contraseña incorrectos");
        }

        Map<String, Object> user = rows.get(0);
        if (!passwordEncoder.matches(password, String.valueOf(user.get("password")))) {
            long userId = ((Number) user.get("id")).longValue();
            auditService.record(userId, "login_intento", "usuario", userId,
                    "Intento fallido de login", request);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Email o contraseña incorrectos");
        }

        long userId = ((Number) user.get("id")).longValue();
        String role = String.valueOf(user.get("role"));
        String token = tokenService.generate(userId, role);
        auditService.record(userId, "login", "usuario", userId, "Login exitoso", request);
        return Map.of(
                "id", userId,
                "email", user.get("email"),
                "nombre", user.get("nombre"),
                "role", role,
                "token", token);
    }

    public Map<String, Object> logout(HttpServletRequest request) {
        Map<String, Object> user = requireUser(request, null);
        long userId = ((Number) user.get("id")).longValue();
        auditService.record(userId, "logout", "usuario", userId, "Logout realizado", request);
        return null;
    }

    public Map<String, Object> verifyToken(HttpServletRequest request) {
        Map<String, Object> user = requireUser(request, null);
        return Map.of(
                "id", user.get("id"),
                "email", user.get("email"),
                "role", user.get("role"));
    }

    public Map<String, Object> requireUser(HttpServletRequest request, String requiredRole) {
        return requireUserInRoles(request, requiredRole == null ? Set.of() : Set.of(requiredRole));
    }

    public Map<String, Object> requireUserInRoles(HttpServletRequest request, Set<String> requiredRoles) {
        String authorization = request.getHeader("Authorization");
        String token;
        if (authorization != null) {
            token = authorization.matches("(?i)^Bearer\\s+.+$")
                    ? authorization.replaceFirst("(?i)^Bearer\\s+", "").trim()
                    : null;
        } else {
            token = request.getHeader("X-Auth-Token");
        }
        if (token == null || token.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Token no proporcionado");
        }

        Map<String, Object> claims = tokenService.verify(token);
        if (claims == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Token inválido o expirado");
        }
        Object userIdClaim = claims.get("user_id");
        long userId = userIdClaim instanceof Number number
                ? number.longValue()
                : Long.parseLong((String) userIdClaim);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT id, email, nombre, role, estado, is_active
                FROM users
                WHERE id = ?
                """, userId);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Usuario inválido o inactivo");
        }

        Map<String, Object> user = rows.get(0);
        if ("inactivo".equals(user.get("estado")) || !isActive(user.get("is_active"))) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Usuario inválido o inactivo");
        }
        if (!requiredRoles.isEmpty() && !requiredRoles.contains(user.get("role"))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos para esta acción");
        }
        return user;
    }

    private String text(Map<String, Object> input, String key) {
        Object value = input == null ? null : input.get(key);
        return value == null ? "" : value.toString().trim();
    }

    private boolean isActive(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        return value instanceof Number number && number.intValue() == 1;
    }
}
