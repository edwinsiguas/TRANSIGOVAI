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

@WebMvcTest(ActionLogController.class)
class ActionLogControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ActionLogService actionLogService;
    @MockitoBean
    private AuthService authService;
    @MockitoBean
    private RateLimitService rateLimitService;

    @Test
    void listsActionLogs() throws Exception {
        when(authService.requireUserInRoles(any(), eq(Set.of("admin", "operador"))))
                .thenReturn(Map.of("id", 1L, "role", "admin"));
        when(actionLogService.listLogs(any()))
                .thenReturn(Map.of(
                        "data", List.of(Map.of("id", 1, "accion", "crear", "entidad", "vehiculo")),
                        "pagination", Map.of("total", 1, "page", 1, "pages", 1)));

        mockMvc.perform(get("/api/logs/list.php"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.data[0].accion").value("crear"));
    }
}
