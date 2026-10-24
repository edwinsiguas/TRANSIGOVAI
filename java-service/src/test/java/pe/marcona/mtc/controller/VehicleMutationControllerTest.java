package pe.marcona.mtc.controller;

import pe.marcona.mtc.service.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(VehicleMutationController.class)
class VehicleMutationControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private VehicleMutationService vehicleMutationService;
    @MockitoBean
    private AuthService authService;
    @MockitoBean
    private RateLimitService rateLimitService;

    @Test
    void createsVehicleWithMultipart() throws Exception {
        when(authService.requireUserInRoles(any(), eq(Set.of("admin", "operador"))))
                .thenReturn(Map.of("id", 1L, "role", "admin"));

        when(vehicleMutationService.createVehicle(any(), any(), eq(1L), any()))
                .thenReturn(Map.of("id", 100L, "placa", "M1-1234", "images", List.of()));

        MockMultipartFile image = new MockMultipartFile("images[]", "car.jpg", "image/jpeg", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/vehicles/create.php")
                        .file(image)
                        .param("placa", "M1-1234")
                        .param("categoria", "L5")
                        .param("marca", "Bajaj")
                        .param("modelo", "Torito")
                        .param("color", "Rojo"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.placa").value("M1-1234"));
    }

    @Test
    void updatesVehicle() throws Exception {
        when(authService.requireUserInRoles(any(), eq(Set.of("admin", "operador"))))
                .thenReturn(Map.of("id", 1L, "role", "admin"));

        when(vehicleMutationService.updateVehicle(any(), eq(1L), any()))
                .thenReturn(Map.of("id", 100L, "placa", "M1-1234", "color", "Azul"));

        mockMvc.perform(post("/api/vehicles/update.php")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\": 100, \"color\": \"Azul\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.color").value("Azul"));
    }
}
