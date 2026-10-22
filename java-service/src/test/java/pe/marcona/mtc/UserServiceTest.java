package pe.marcona.mtc;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final AuthService authService = mock(AuthService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final UserService userService = new UserService(jdbcTemplate, authService, auditService);
    private final HttpServletRequest request = mock(HttpServletRequest.class);

    @Test
    void preventsNonAdminUsersFromEditingAnotherAccount() {
        when(authService.requireUser(eq(request), eq(null)))
                .thenReturn(Map.of("id", 4, "role", "operador"));

        assertThatThrownBy(() -> userService.update(
                        Map.of("id", 9, "nombre", "Nombre nuevo"), request))
                .isInstanceOf(ApiException.class)
                .hasMessage("No tienes permiso para editar este usuario");

        verify(jdbcTemplate, never()).queryForList(
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any(Object[].class));
    }
}
