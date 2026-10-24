package pe.marcona.mtc.controller;

import pe.marcona.mtc.service.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ExportController.class)
class ExportControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ExportService exportService;
    @MockitoBean
    private AuthService authService;
    @MockitoBean
    private RateLimitService rateLimitService;

    @Test
    void exportsCompanies() throws Exception {
        when(authService.requireUserInRoles(any(), eq(Set.of("admin", "operador"))))
                .thenReturn(Map.of("id", 1L, "role", "admin"));
        when(exportService.exportCompanies(any()))
                .thenReturn(List.of(Map.of("id", 1, "razon_social", "Empresa San Juan")));

        mockMvc.perform(get("/api/companies/export.php"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].razon_social").value("Empresa San Juan"));
    }

    @Test
    void exportsVehicles() throws Exception {
        when(authService.requireUserInRoles(any(), eq(Set.of("admin", "operador"))))
                .thenReturn(Map.of("id", 1L, "role", "operador"));
        when(exportService.exportVehicles(any()))
                .thenReturn(List.of(Map.of("placa", "V1-1234", "marca", "Toyota")));

        mockMvc.perform(get("/api/vehicles/export.php"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].placa").value("V1-1234"));
    }
}
