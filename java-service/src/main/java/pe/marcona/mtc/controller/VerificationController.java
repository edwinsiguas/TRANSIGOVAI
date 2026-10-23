package pe.marcona.mtc.controller;

import pe.marcona.mtc.service.*;
import pe.marcona.mtc.dto.ApiResponse;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/verifications")
public class VerificationController {
    private static final Set<String> ALLOWED_ROLES = Set.of("admin", "operador", "fiscalizador");

    private final VerificationService verificationService;
    private final AuthService authService;

    public VerificationController(VerificationService verificationService, AuthService authService) {
        this.verificationService = verificationService;
        this.authService = authService;
    }

    @PostMapping("/create.php")
    public ApiResponse<Map<String, Object>> create(
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        Map<String, Object> user = authService.requireUserInRoles(request, ALLOWED_ROLES);
        return ApiResponse.success(
                verificationService.create(body == null ? Map.of() : body, request, user),
                "Verificación completada");
    }

    @GetMapping("/list.php")
    public ApiResponse<Map<String, Object>> list(
            @RequestParam Map<String, String> query, HttpServletRequest request) {
        Map<String, Object> user = authService.requireUserInRoles(request, ALLOWED_ROLES);
        return ApiResponse.success(verificationService.list(query, user), "OK");
    }
}
