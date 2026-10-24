package pe.marcona.mtc.controller;

import pe.marcona.mtc.service.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PermitController.class)
class PermitControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PermitService permitService;
    @MockitoBean
    private CirculationService circulationService;
    @MockitoBean
    private AuthService authService;
    @MockitoBean
    private RateLimitService rateLimitService;

    @Test
    void listsPermitsForOperativeStaff() throws Exception {
        when(authService.requireUserInRoles(any(), eq(Set.of("admin", "operador"))))
                .thenReturn(Map.of("id", 1L, "role", "operador"));
        when(permitService.listPermits(any())).thenReturn(Map.of(
                "data", List.of(Map.of("id", 10, "numero_permiso", "PERM-2026-00001")),
                "pagination", Map.of("total", 1, "page", 1, "pages", 1)));

        mockMvc.perform(get("/api/permits"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.data[0].numero_permiso").value("PERM-2026-00001"));
    }

    @Test
    void getsPermitById() throws Exception {
        when(authService.requireUserInRoles(any(), eq(Set.of("admin", "operador"))))
                .thenReturn(Map.of("id", 1L, "role", "admin"));
        when(permitService.getPermitById(10L)).thenReturn(Map.of(
                "id", 10L,
                "numero_permiso", "PERM-2026-00001",
                "placa", "ABC-123"));

        mockMvc.perform(get("/api/permits/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.placa").value("ABC-123"));
    }

    @Test
    void generatesPermit() throws Exception {
        when(authService.requireUserInRoles(any(), eq(Set.of("admin", "operador"))))
                .thenReturn(Map.of("id", 1L, "role", "operador"));
        when(permitService.generatePermit(any(), eq(1L), any())).thenReturn(Map.of(
                "id", 15L,
                "numero_permiso", "PERM-2026-00002"));

        mockMvc.perform(post("/api/permits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vehicle_id\": 5, \"fecha_vencimiento\": \"2027-10-23\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.numero_permiso").value("PERM-2026-00002"));
    }

    @Test
    void revokesPermit() throws Exception {
        when(authService.requireUser(any(), eq("admin")))
                .thenReturn(Map.of("id", 1L, "role", "admin"));
        when(permitService.revokePermit(eq(15L), any(), eq(1L), any())).thenReturn(true);

        mockMvc.perform(put("/api/permits/15/revoke")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\": \"Infracción grave\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Permiso revocado correctamente"));
    }
}
