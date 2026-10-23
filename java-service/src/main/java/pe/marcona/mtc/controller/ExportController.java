package pe.marcona.mtc.controller;

import pe.marcona.mtc.service.*;
import pe.marcona.mtc.dto.ApiResponse;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api")
public class ExportController {
    private final ExportService exportService;
    private final AuthService authService;
    private final RateLimitService rateLimitService;

    public ExportController(
            ExportService exportService,
            AuthService authService,
            RateLimitService rateLimitService) {
        this.exportService = exportService;
        this.authService = authService;
        this.rateLimitService = rateLimitService;
    }

    @GetMapping({"/companies/export.php", "/companies/export"})
    public ApiResponse<List<Map<String, Object>>> exportCompanies(
            @RequestParam Map<String, String> query,
            HttpServletRequest request) {
        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        return ApiResponse.success(exportService.exportCompanies(query), "Exportación exitosa");
    }

    @GetMapping({"/drivers/export.php", "/drivers/export"})
    public ApiResponse<List<Map<String, Object>>> exportDrivers(
            @RequestParam Map<String, String> query,
            HttpServletRequest request) {
        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        return ApiResponse.success(exportService.exportDrivers(query), "Exportación de conductores exitosa");
    }

    @GetMapping({"/vehicles/export.php", "/vehicles/export"})
    public ApiResponse<List<Map<String, Object>>> exportVehicles(
            @RequestParam Map<String, String> query,
            HttpServletRequest request) {
        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        return ApiResponse.success(exportService.exportVehicles(query), "Exportación de vehículos exitosa");
    }

    @GetMapping({"/permits/export.php", "/permits/export"})
    public ApiResponse<List<Map<String, Object>>> exportPermits(
            @RequestParam Map<String, String> query,
            HttpServletRequest request) {
        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        return ApiResponse.success(exportService.exportPermits(query), "Exportación de permisos exitosa");
    }
}
