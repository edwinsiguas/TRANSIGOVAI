package pe.marcona.mtc.controller;

import pe.marcona.mtc.service.*;
import pe.marcona.mtc.dto.ApiResponse;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleMutationController {
    private final VehicleMutationService vehicleMutationService;
    private final AuthService authService;
    private final RateLimitService rateLimitService;

    public VehicleMutationController(
            VehicleMutationService vehicleMutationService,
            AuthService authService,
            RateLimitService rateLimitService) {
        this.vehicleMutationService = vehicleMutationService;
        this.authService = authService;
        this.rateLimitService = rateLimitService;
    }

    @PostMapping(value = {"/create.php", ""})
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> create(
            @RequestParam(required = false) Map<String, String> queryParams,
            HttpServletRequest request) {

        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
        Map<String, Object> user = authService.requireUserInRoles(request, Set.of("admin", "operador"));
        long actorId = ((Number) user.get("id")).longValue();

        Map<String, String> params = new HashMap<>();
        if (queryParams != null) {
            params.putAll(queryParams);
        }
        request.getParameterMap().forEach((k, v) -> {
            if (v != null && v.length > 0 && !params.containsKey(k)) {
                params.put(k, v[0]);
            }
        });

        List<MultipartFile> files = extractImages(request);

        Map<String, Object> created = vehicleMutationService.createVehicle(params, files, actorId, request);
        return ApiResponse.success(created, "Vehículo registrado exitosamente");
    }

    @RequestMapping(value = {"/update.php", ""}, method = {RequestMethod.POST, RequestMethod.PUT})
    public ApiResponse<Map<String, Object>> update(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(required = false) Map<String, String> queryParams,
            HttpServletRequest request) {

        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
        Map<String, Object> user = authService.requireUserInRoles(request, Set.of("admin", "operador"));
        long actorId = ((Number) user.get("id")).longValue();

        Map<String, Object> input = new HashMap<>();
        if (queryParams != null) {
            input.putAll(queryParams);
        }
        if (body != null) {
            input.putAll(body);
        }

        Map<String, Object> updated = vehicleMutationService.updateVehicle(input, actorId, request);
        return ApiResponse.success(updated, "Vehículo actualizado exitosamente");
    }

    @PostMapping(value = {"/upload-images.php", "/upload-images"})
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> uploadImages(
            @RequestParam("vehicle_id") long vehicleId,
            HttpServletRequest request) {

        rateLimitService.check("api_general", request.getRemoteAddr(), 120, 60);
        Map<String, Object> user = authService.requireUserInRoles(request, Set.of("admin", "operador"));
        long actorId = ((Number) user.get("id")).longValue();

        List<MultipartFile> files = extractImages(request);

        Map<String, Object> result = vehicleMutationService.uploadImages(vehicleId, files, actorId, request);
        return ApiResponse.success(result, "Imágenes subidas exitosamente");
    }

    private List<MultipartFile> extractImages(HttpServletRequest request) {
        List<MultipartFile> files = new ArrayList<>();
        if (request instanceof MultipartHttpServletRequest multipartRequest) {
            // Check for images[], images, etc.
            List<MultipartFile> bracketImages = multipartRequest.getFiles("images[]");
            if (bracketImages != null && !bracketImages.isEmpty()) {
                files.addAll(bracketImages);
            }
            List<MultipartFile> plainImages = multipartRequest.getFiles("images");
            if (plainImages != null && !plainImages.isEmpty()) {
                files.addAll(plainImages);
            }
        }
        return files;
    }
}
