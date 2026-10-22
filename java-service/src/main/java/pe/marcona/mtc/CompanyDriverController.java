package pe.marcona.mtc;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api")
public class CompanyDriverController {
    private final CompanyDriverService companyDriverService;
    private final AuthService authService;

    public CompanyDriverController(CompanyDriverService companyDriverService, AuthService authService) {
        this.companyDriverService = companyDriverService;
        this.authService = authService;
    }

    @GetMapping("/companies/list.php")
    public ApiResponse<Map<String, Object>> listCompanies(
            @RequestParam Map<String, String> query, HttpServletRequest request) {
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        return ApiResponse.success(companyDriverService.listCompanies(query), null);
    }

    @GetMapping("/companies/get.php")
    public ApiResponse<Map<String, Object>> getCompany(
            @RequestParam long id, HttpServletRequest request) {
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        return ApiResponse.success(companyDriverService.getCompany(id), null);
    }

    @PostMapping("/companies/create.php")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> createCompany(
            @RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> actor = authService.requireUser(request, "admin");
        long actorId = ((Number) actor.get("id")).longValue();
        return ApiResponse.success(companyDriverService.createCompany(
                body == null ? Map.of() : body, request, actorId), "Empresa creada exitosamente");
    }

    @PutMapping("/companies/update.php")
    public ApiResponse<Map<String, Object>> updateCompany(
            @RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> actor = authService.requireUser(request, "admin");
        long actorId = ((Number) actor.get("id")).longValue();
        return ApiResponse.success(companyDriverService.updateCompany(
                body == null ? Map.of() : body, request, actorId), "Empresa actualizada exitosamente");
    }

    @PutMapping("/companies/toggle-status.php")
    public ApiResponse<Map<String, Object>> toggleCompanyStatus(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(required = false) String id,
            HttpServletRequest request) {
        Map<String, Object> actor = authService.requireUser(request, "admin");
        long actorId = ((Number) actor.get("id")).longValue();
        Object requestedId = body != null && body.get("id") != null ? body.get("id") : id;
        return ApiResponse.success(companyDriverService.toggleCompany(parseId(requestedId), request, actorId),
                "Estado actualizado exitosamente");
    }

    @GetMapping("/drivers/list.php")
    public ApiResponse<Map<String, Object>> listDrivers(
            @RequestParam Map<String, String> query, HttpServletRequest request) {
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        return ApiResponse.success(companyDriverService.listDrivers(query), null);
    }

    @PostMapping("/drivers/create.php")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> createDriver(
            @RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> actor = authService.requireUserInRoles(request, Set.of("admin", "operador"));
        long actorId = ((Number) actor.get("id")).longValue();
        return ApiResponse.success(companyDriverService.createDriver(
                body == null ? Map.of() : body, request, actorId), "Chofer creado exitosamente");
    }

    @RequestMapping(value = "/drivers/update.php", method = {RequestMethod.POST, RequestMethod.PUT})
    public ApiResponse<Map<String, Object>> updateDriver(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(required = false) String id,
            HttpServletRequest request) {
        Map<String, Object> actor = authService.requireUserInRoles(request, Set.of("admin", "operador"));
        long actorId = ((Number) actor.get("id")).longValue();
        Map<String, Object> input = body == null ? new LinkedHashMap<>() : new LinkedHashMap<>(body);
        if (!input.containsKey("id") && id != null) {
            input.put("id", id);
        }
        return ApiResponse.success(companyDriverService.updateDriver(
                input, request, actorId), "Chofer actualizado exitosamente");
    }

    private long parseId(Object value) {
        if (value == null || value.toString().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ID de empresa requerido");
        }
        try {
            long id = Long.parseLong(value.toString());
            if (id > 0) {
                return id;
            }
        } catch (NumberFormatException ignored) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ID de empresa requerido");
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "ID de empresa requerido");
    }
}
