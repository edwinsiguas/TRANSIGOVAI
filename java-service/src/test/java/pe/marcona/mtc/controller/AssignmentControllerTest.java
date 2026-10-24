package pe.marcona.mtc.controller;

import pe.marcona.mtc.service.*;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AssignmentController.class)
class AssignmentControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AssignmentService assignmentService;

    @MockitoBean
    private CirculationService circulationService;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private AuditService auditService;

    @MockitoBean
    private RateLimitService rateLimitService;

    @Test
    void assignmentListSupportsOperatorRoleAndNestedPaginationResponse() throws Exception {
        when(authService.requireUserInRoles(any(HttpServletRequest.class), eq(java.util.Set.of("admin", "operador"))))
                .thenReturn(Map.of("id", 3, "role", "operador"));
        when(assignmentService.list(any())).thenReturn(Map.of(
                "data", List.of(Map.of("id", 8, "placa", "ABC-123")),
                "pagination", Map.of("page", 1, "limit", 10, "total", 1, "pages", 1)));

        mockMvc.perform(get("/api/assignments").header("X-Auth-Token", "token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.data[0].placa").value("ABC-123"))
                .andExpect(jsonPath("$.data.pagination.total").value(1));
    }

    @Test
    void createPreservesCreatedStatusAndResponseContract() throws Exception {
        when(authService.requireUser(any(HttpServletRequest.class), eq("admin")))
                .thenReturn(Map.of("id", 3, "role", "admin"));
        when(assignmentService.assign(any(), eq(3L))).thenReturn(Map.of(
                "id", 8, "vehicle_id", 20, "driver_id", 30, "tipo", "propietario"));

        mockMvc.perform(post("/api/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"vehicle_id":20,"driver_id":30,"tipo":"propietario"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.vehicle_id").value(20))
                .andExpect(jsonPath("$.message").value("Conductor asignado exitosamente"));
    }
}
