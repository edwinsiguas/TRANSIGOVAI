package pe.marcona.mtc.controller;

import pe.marcona.mtc.service.*;
import pe.marcona.mtc.dto.ApiResponse;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UsersController {
    private final UserService userService;

    public UsersController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/list.php")
    public ApiResponse<Map<String, Object>> list(
            @RequestParam Map<String, String> query,
            HttpServletRequest request) {
        return ApiResponse.success(userService.list(query, request), null);
    }

    @PostMapping("/create.php")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> create(
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        return ApiResponse.success(userService.create(body, request), "Usuario creado exitosamente");
    }

    @PostMapping("/update.php")
    public ApiResponse<Map<String, Object>> update(
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        return ApiResponse.success(userService.update(body, request), "Usuario actualizado exitosamente");
    }
}
