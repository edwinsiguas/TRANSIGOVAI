package pe.marcona.mtc.controller;

import pe.marcona.mtc.service.*;
import pe.marcona.mtc.dto.ApiResponse;
import pe.marcona.mtc.exception.ApiException;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleQueryController {
    private final VehicleQueryService vehicleQueryService;
    private final AuthService authService;

    public VehicleQueryController(VehicleQueryService vehicleQueryService, AuthService authService) {
        this.vehicleQueryService = vehicleQueryService;
        this.authService = authService;
    }

    @GetMapping("/list.php")
    public ApiResponse<Map<String, Object>> list(
            @RequestParam Map<String, String> query, HttpServletRequest request) {
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        return ApiResponse.success(vehicleQueryService.list(query), null);
    }

    @PutMapping("/toggle-status.php")
    public ApiResponse<Map<String, Object>> toggleStatus(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(required = false) String id,
            HttpServletRequest request) {
        Map<String, Object> actor = authService.requireUser(request, "admin");
        Object requestedId = body != null && body.get("id") != null ? body.get("id") : id;
        long vehicleId = parseId(requestedId);
        long actorId = ((Number) actor.get("id")).longValue();
        return ApiResponse.success(vehicleQueryService.toggleStatus(vehicleId, request, actorId),
                "Estado actualizado exitosamente");
    }

    private long parseId(Object value) {
        if (value == null || value.toString().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ID de vehículo requerido");
        }
        try {
            long id = Long.parseLong(value.toString());
            if (id > 0) return id;
        } catch (NumberFormatException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ID de vehículo requerido");
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "ID de vehículo requerido");
    }
}
