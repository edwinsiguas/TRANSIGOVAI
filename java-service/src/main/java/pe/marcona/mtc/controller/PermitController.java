package pe.marcona.mtc.controller;

import pe.marcona.mtc.service.*;
import pe.marcona.mtc.dto.ApiResponse;
import pe.marcona.mtc.exception.ApiException;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/permits")
public class PermitController {
    private final PermitService permitService;
    private final CirculationService circulationService;
    private final AuthService authService;
    private final RateLimitService rateLimitService;

    public PermitController(
            PermitService permitService,
            CirculationService circulationService,
            AuthService authService,
            RateLimitService rateLimitService) {
        this.permitService = permitService;
        this.circulationService = circulationService;
        this.authService = authService;
        this.rateLimitService = rateLimitService;
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> list(
            @RequestParam Map<String, String> query,
            HttpServletRequest request) {
        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        return ApiResponse.success(permitService.listPermits(query), null);
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> get(
            @PathVariable long id,
            HttpServletRequest request) {
        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        return ApiResponse.success(permitService.getPermitById(id), null);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> generate(
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
        Map<String, Object> user = authService.requireUserInRoles(request, Set.of("admin", "operador"));
        long userId = ((Number) user.get("id")).longValue();
        Map<String, Object> input = body == null ? Map.of() : body;
        return ApiResponse.success(
                permitService.generatePermit(input, userId, request),
                "Permiso generado exitosamente");
    }

    @PutMapping("/{id}/revoke")
    public ApiResponse<Void> revoke(
            @PathVariable long id,
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
        Map<String, Object> user = authService.requireUser(request, "admin");
        long userId = ((Number) user.get("id")).longValue();
        String motivo = body == null ? null : (String) body.get("motivo");

        boolean revoked = permitService.revokePermit(id, motivo, userId, request);
        if (!revoked) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Permiso no encontrado o ya no está vigente");
        }
        return ApiResponse.success(null, "Permiso revocado correctamente");
    }

    @PostMapping("/{id}/renew")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> renew(
            @PathVariable long id,
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
        Map<String, Object> user = authService.requireUser(request, "admin");
        long userId = ((Number) user.get("id")).longValue();
        Map<String, Object> input = body == null ? Map.of() : body;

        return ApiResponse.success(
                permitService.renewPermit(id, input, userId, request),
                "Permiso renovado exitosamente");
    }

    @PostMapping("/verify")
    public ApiResponse<Map<String, Object>> verify(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(required = false) Map<String, String> queryParams,
            HttpServletRequest request) {
        rateLimitService.check("permit_verify", request.getRemoteAddr(), 60, 60);

        Map<String, Object> payload = new HashMap<>();
        if (queryParams != null) {
            payload.putAll(queryParams);
        }
        if (body != null) {
            payload.putAll(body);
        }

        Map<String, Object> result = circulationService.validate(payload);
        return ApiResponse.success(result, String.valueOf(result.get("razon")));
    }

    @GetMapping("/vehicle-images/{id}")
    public ApiResponse<List<Map<String, Object>>> vehicleImages(
            @PathVariable long id,
            HttpServletRequest request) {
        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
        if (id <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "vehicle_id inválido");
        }
        return ApiResponse.success(permitService.getVehicleImages(id), null);
    }

    @PostMapping("/expire")
    public ApiResponse<Map<String, Object>> markExpired(HttpServletRequest request) {
        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
        Map<String, Object> user = authService.requireUser(request, "admin");
        long userId = ((Number) user.get("id")).longValue();

        List<Long> expired = permitService.markExpired(userId, request);
        int count = expired.size();
        return ApiResponse.success(
                Map.of("marcados_vencidos", count),
                count + " permiso(s) marcados como vencidos");
    }
}
