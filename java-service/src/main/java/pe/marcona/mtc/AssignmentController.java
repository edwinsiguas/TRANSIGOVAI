package pe.marcona.mtc;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
@RequestMapping("/api/assignments")
public class AssignmentController {
    private final AssignmentService assignmentService;
    private final CirculationService circulationService;
    private final AuthService authService;
    private final AuditService auditService;
    private final RateLimitService rateLimitService;

    public AssignmentController(
            AssignmentService assignmentService,
            CirculationService circulationService,
            AuthService authService,
            AuditService auditService,
            RateLimitService rateLimitService) {
        this.assignmentService = assignmentService;
        this.circulationService = circulationService;
        this.authService = authService;
        this.auditService = auditService;
        this.rateLimitService = rateLimitService;
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> list(
            @RequestParam Map<String, String> query,
            HttpServletRequest request) {
        limitGeneralRequests(request);
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        return ApiResponse.success(assignmentService.list(query), null);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> assign(
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        limitGeneralRequests(request);
        Map<String, Object> actor = authService.requireUser(request, "admin");
        long actorId = ((Number) actor.get("id")).longValue();
        Map<String, Object> assignment = assignmentService.assign(body == null ? Map.of() : body, actorId);
        long vehicleId = ((Number) assignment.get("vehicle_id")).longValue();
        auditService.record(actorId, "asignar_conductor", "vehiculo", vehicleId,
                "Conductor ID " + assignment.get("driver_id") + " asignado como " + assignment.get("tipo"), request);
        return ApiResponse.success(assignment, "Conductor asignado exitosamente");
    }

    @GetMapping("/vehicle/{id}")
    public ApiResponse<Map<String, Object>> byVehicle(@PathVariable long id, HttpServletRequest request) {
        limitGeneralRequests(request);
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        Map<String, Object> assignment = assignmentService.activeByVehicle(id);
        if (assignment == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No hay conductor asignado a este vehículo");
        }
        return ApiResponse.success(assignment, null);
    }

    @GetMapping("/driver/{id}")
    public ApiResponse<Map<String, Object>> byDriver(@PathVariable long id, HttpServletRequest request) {
        limitGeneralRequests(request);
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        Map<String, Object> vehicle = assignmentService.activeByDriver(id);
        if (vehicle == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "El conductor no tiene vehículo asignado actualmente");
        }
        return ApiResponse.success(vehicle, null);
    }

    @GetMapping("/history/vehicle/{id}")
    public ApiResponse<List<Map<String, Object>>> history(@PathVariable long id, HttpServletRequest request) {
        limitGeneralRequests(request);
        authService.requireUserInRoles(request, Set.of("admin", "operador"));
        return ApiResponse.success(assignmentService.history(id), null);
    }

    @DeleteMapping("/vehicle/{id}")
    public ApiResponse<Void> unassign(@PathVariable long id, HttpServletRequest request) {
        limitGeneralRequests(request);
        Map<String, Object> actor = authService.requireUser(request, "admin");
        if (!assignmentService.unassign(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No había conductor activo asignado a este vehículo");
        }
        auditService.record(((Number) actor.get("id")).longValue(), "desasignar_conductor",
                "vehiculo", id, "Conductor desasignado", request);
        return ApiResponse.success(null, "Conductor desasignado correctamente");
    }

    @GetMapping("/validate")
    public ApiResponse<Map<String, Object>> validate(
            @RequestParam Map<String, String> query, HttpServletRequest request) {
        limitGeneralRequests(request);
        Map<String, Object> data = new HashMap<>();
        for (String key : List.of("placa", "dni", "numero_permiso")) {
            if (query.containsKey(key)) {
                data.put(key, query.get(key));
            }
        }
        Map<String, Object> result = circulationService.validate(data);
        return ApiResponse.success(result, String.valueOf(result.get("razon")));
    }

    private void limitGeneralRequests(HttpServletRequest request) {
        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
    }
}
