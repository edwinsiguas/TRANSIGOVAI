package pe.marcona.mtc;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/stats")
public class StatisticsController {
    private final StatisticsService statisticsService;
    private final AuthService authService;
    private final RateLimitService rateLimitService;

    public StatisticsController(
            StatisticsService statisticsService, AuthService authService, RateLimitService rateLimitService) {
        this.statisticsService = statisticsService;
        this.authService = authService;
        this.rateLimitService = rateLimitService;
    }

    @GetMapping("/dashboard")
    public ApiResponse<Map<String, Object>> dashboard(HttpServletRequest request) {
        limitGeneralRequests(request);
        return ApiResponse.success(statisticsService.dashboard(), null);
    }

    @GetMapping("/companies")
    public ApiResponse<Map<String, Object>> companies(HttpServletRequest request) {
        limitGeneralRequests(request);
        return ApiResponse.success(statisticsService.companies(), null);
    }

    @GetMapping("/analytics")
    public ApiResponse<Map<String, Object>> analytics(HttpServletRequest request) {
        limitGeneralRequests(request);
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        return ApiResponse.success(statisticsService.analytics(), "Estadísticas recuperadas");
    }

    private void limitGeneralRequests(HttpServletRequest request) {
        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
    }
}
