package pe.marcona.mtc.controller;

import pe.marcona.mtc.service.*;
import pe.marcona.mtc.dto.ApiResponse;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/logs")
public class ActionLogController {
    private final ActionLogService actionLogService;
    private final AuthService authService;
    private final RateLimitService rateLimitService;

    public ActionLogController(
            ActionLogService actionLogService,
            AuthService authService,
            RateLimitService rateLimitService) {
        this.actionLogService = actionLogService;
        this.authService = authService;
        this.rateLimitService = rateLimitService;
    }

    @GetMapping({"/list.php", ""})
    public ApiResponse<Map<String, Object>> list(
            @RequestParam Map<String, String> query,
            HttpServletRequest request) {
        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        return ApiResponse.success(actionLogService.listLogs(query), null);
    }
}
