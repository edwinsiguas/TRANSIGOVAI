package pe.marcona.mtc;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(VehicleQueryController.class)
class VehicleQueryControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private VehicleQueryService vehicleQueryService;

    @MockitoBean
    private AuthService authService;

    @Test
    void listAllowsOperatorAndReturnsVehiclePagination() throws Exception {
        when(authService.requireUserInRoles(any(HttpServletRequest.class), eq(Set.of("admin", "operador"))))
                .thenReturn(Map.of("id", 2, "role", "operador"));
        when(vehicleQueryService.list(any())).thenReturn(Map.of(
                "data", java.util.List.of(Map.of("id", 5, "placa", "ABC-123")),
                "pagination", Map.of("page", 1, "limit", 10, "total", 1, "pages", 1)));

        mockMvc.perform(get("/api/vehicles/list.php").header("X-Auth-Token", "token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data[0].placa").value("ABC-123"))
                .andExpect(jsonPath("$.data.pagination.total").value(1));
    }

    @Test
    void statusToggleRemainsAdminOnlyAndReturnsLegacyPayload() throws Exception {
        when(authService.requireUser(any(HttpServletRequest.class), eq("admin")))
                .thenReturn(Map.of("id", 2, "role", "admin"));
        when(vehicleQueryService.toggleStatus(eq(5L), any(HttpServletRequest.class), eq(2L)))
                .thenReturn(Map.of("id", 5, "estado", "inactivo"));

        mockMvc.perform(put("/api/vehicles/toggle-status.php")
                        .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"id\":5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(5))
                .andExpect(jsonPath("$.data.estado").value("inactivo"));
    }
}
