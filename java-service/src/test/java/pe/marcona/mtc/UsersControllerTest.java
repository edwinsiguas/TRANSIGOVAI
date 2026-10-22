package pe.marcona.mtc;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UsersController.class)
class UsersControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @Test
    void listPreservesTheNestedPaginationShapeUsedByTheWebClient() throws Exception {
        when(userService.list(any(), any())).thenReturn(Map.of(
                "data", List.of(Map.of("id", 3, "email", "user@example.com", "role", "operador")),
                "pagination", Map.of("page", 1, "limit", 10, "total", 1, "pages", 1)));

        mockMvc.perform(get("/api/users/list.php").param("page", "1").param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.data[0].email").value("user@example.com"))
                .andExpect(jsonPath("$.data.pagination.total").value(1));
    }

    @Test
    void createsUsersWithTheSameSuccessStatusAndEnvelope() throws Exception {
        when(userService.create(any(), any())).thenReturn(Map.of("id", 12, "email", "new@example.com"));

        mockMvc.perform(post("/api/users/create.php")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"new@example.com","password":"a-strong-password","nombre":"Nuevo Usuario","role":"operador"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(12))
                .andExpect(jsonPath("$.message").value("Usuario creado exitosamente"));
    }
}
