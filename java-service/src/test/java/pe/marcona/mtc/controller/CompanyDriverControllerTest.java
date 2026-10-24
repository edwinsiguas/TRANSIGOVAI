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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CompanyDriverController.class)
class CompanyDriverControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CompanyDriverService companyDriverService;

    @MockitoBean
    private AuthService authService;

    @Test
    void companyListSupportsOperatorAndKeepsPaginationEnvelope() throws Exception {
        when(authService.requireUserInRoles(any(HttpServletRequest.class), eq(Set.of("admin", "operador"))))
                .thenReturn(Map.of("id", 7, "role", "operador"));
        when(companyDriverService.listCompanies(any())).thenReturn(Map.of(
                "data", java.util.List.of(Map.of("id", 9, "nombre", "Transportes")),
                "pagination", Map.of("page", 1, "limit", 10, "total", 1, "active_total", 1, "pages", 1)));

        mockMvc.perform(get("/api/companies/list.php").header("X-Auth-Token", "token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.data[0].nombre").value("Transportes"))
                .andExpect(jsonPath("$.data.pagination.total").value(1));
    }

    @Test
    void driverCreateReturnsCreatedStatusAndLegacyResponseShape() throws Exception {
        when(authService.requireUserInRoles(any(HttpServletRequest.class), eq(Set.of("admin", "operador"))))
                .thenReturn(Map.of("id", 7, "role", "operador"));
        when(companyDriverService.createDriver(any(), any(HttpServletRequest.class), eq(7L)))
                .thenReturn(Map.of("id", 12, "nombre_completo", "Chofer de prueba"));

        mockMvc.perform(post("/api/drivers/create.php")
                        .header("X-Auth-Token", "token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre_completo":"Chofer de prueba"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(12))
                .andExpect(jsonPath("$.message").value("Chofer creado exitosamente"));
    }
}
