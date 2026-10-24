package pe.marcona.mtc.controller;

import pe.marcona.mtc.service.*;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(VerificationController.class)
class VerificationControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private VerificationService verificationService;

    @MockitoBean
    private AuthService authService;

    @Test
    void createAllowsFiscalizadorAndPreservesVerificationResponse() throws Exception {
        Map<String, Object> user = Map.of("id", 14, "role", "fiscalizador");
        when(authService.requireUserInRoles(any(HttpServletRequest.class), eq(Set.of("admin", "operador", "fiscalizador"))))
                .thenReturn(user);
        when(verificationService.create(any(), any(HttpServletRequest.class), eq(user)))
                .thenReturn(Map.of("puede_circular", true, "razon", "Permiso válido"));

        mockMvc.perform(post("/api/verifications/create.php")
                        .header("X-Auth-Token", "token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"search_type":"placa","search_query":"ABC-123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.puede_circular").value(true))
                .andExpect(jsonPath("$.message").value("Verificación completada"));
    }
}
