package pe.marcona.mtc;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class RateLimitService {
    private final JdbcTemplate jdbcTemplate;

    public RateLimitService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void check(String action, String ip, int maximum, int windowSeconds) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM rate_limits
                WHERE ip = ? AND action = ?
                  AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
                """, Integer.class, ip, action, windowSeconds);

        if (count != null && count >= maximum) {
            Long remaining = jdbcTemplate.queryForObject("""
                    SELECT TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(MIN(created_at), INTERVAL ? SECOND))
                    FROM rate_limits
                    WHERE ip = ? AND action = ?
                      AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
                    """, Long.class, windowSeconds, ip, action, windowSeconds);
            long retryAfter = Math.max(1, remaining == null ? windowSeconds : remaining);
            long minutes = (retryAfter + 59) / 60;
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Demasiadas solicitudes. Por favor espera " + minutes
                            + " minuto(s) antes de intentar nuevamente.",
                    retryAfter);
        }

        jdbcTemplate.update("INSERT INTO rate_limits (ip, action) VALUES (?, ?)", ip, action);
    }
}
