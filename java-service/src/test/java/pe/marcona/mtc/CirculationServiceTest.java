package pe.marcona.mtc;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CirculationServiceTest {
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final CirculationService service = new CirculationService(jdbcTemplate);

    @Test
    void validatesDniFormatBeforeQueryingTheDatabase() {
        assertThatThrownBy(() -> service.validate(Map.of("dni", "123")))
                .isInstanceOf(ApiException.class)
                .hasMessage("dni debe tener 8 dígitos");
    }

    @Test
    void returnsTheExistingNotFoundResponseForAnUnassignedPlate() {
        when(jdbcTemplate.queryForList(anyString(), eq("ABC-123"))).thenReturn(List.of());

        Map<String, Object> result = service.validate(Map.of("placa", "abc-123"));

        assertThat(result)
                .containsEntry("puede_circular", false)
                .containsEntry("verificado", false)
                .containsEntry("razon", "Vehículo no encontrado o sin conductor asignado actualmente")
                .containsEntry("data", null);
    }
}
