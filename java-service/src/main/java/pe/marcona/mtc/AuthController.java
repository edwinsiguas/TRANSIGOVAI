package pe.marcona.mtc;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login.php")
    public ApiResponse<Map<String, Object>> login(
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        return ApiResponse.success(authService.login(body, request), "Login exitoso");
    }

    @PostMapping("/logout.php")
    public ApiResponse<Void> logout(HttpServletRequest request) {
        authService.logout(request);
        return ApiResponse.success(null, "Logout exitoso");
    }

    @PostMapping("/verify-token.php")
    public ApiResponse<Map<String, Object>> verifyToken(HttpServletRequest request) {
        return ApiResponse.success(authService.verifyToken(request), "Token válido");
    }
}
