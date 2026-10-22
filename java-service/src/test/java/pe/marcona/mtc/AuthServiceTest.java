package pe.marcona.mtc;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final RateLimitService rateLimitService = mock(RateLimitService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final LegacyTokenService tokenService =
            new LegacyTokenService(new ObjectMapper(), "test-secret", 3600, "test");
    private final AuthService authService =
            new AuthService(jdbcTemplate, tokenService, rateLimitService, auditService);

    @Test
    void loginAcceptsExistingPhpBcryptHashesAndIssuesACompatibleToken() {
        String passwordHash = new BCryptPasswordEncoder(4).encode("valid-password")
                .replaceFirst("^\\$2a\\$", "\\$2y\\$");
        when(jdbcTemplate.queryForList(anyString(), eq("user@example.com"), eq("activo")))
                .thenReturn(List.of(Map.of(
                        "id", 17L,
                        "email", "user@example.com",
                        "password", passwordHash,
                        "nombre", "Usuario",
                        "role", "admin",
                        "estado", "activo",
                        "is_active", true)));
        MockHttpServletRequest request = request();

        Map<String, Object> response = authService.login(
                Map.of("email", "user@example.com", "password", "valid-password"), request);

        assertThat(tokenService.verify((String) response.get("token")))
                .containsEntry("user_id", 17)
                .containsEntry("role", "admin");
        assertThat(response).doesNotContainKey("password");
        verify(rateLimitService).check("login", "127.0.0.1", 5, 900);
        verify(auditService).record(17, "login", "usuario", 17, "Login exitoso", request);
    }

    @Test
    void rejectsAnInactiveUserEvenWhenTheTokenSignatureIsValid() {
        String token = tokenService.generate(17, "admin");
        when(jdbcTemplate.queryForList(anyString(), eq(17L)))
                .thenReturn(List.of(Map.of(
                        "id", 17L,
                        "email", "user@example.com",
                        "nombre", "Usuario",
                        "role", "admin",
                        "estado", "inactivo",
                        "is_active", true)));
        MockHttpServletRequest request = request();
        request.addHeader("Authorization", "Bearer " + token);

        assertThatThrownBy(() -> authService.requireUser(request, "admin"))
                .isInstanceOf(ApiException.class)
                .hasMessage("Usuario inválido o inactivo");
    }

    private MockHttpServletRequest request() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        return request;
    }
}
