package pe.marcona.mtc.service;

import pe.marcona.mtc.exception.ApiException;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class VehicleMutationService {
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;
    private final Path uploadsRoot;

    public VehicleMutationService(
            JdbcTemplate jdbcTemplate,
            AuditService auditService,
            @Value("${app.uploads-dir:uploads}") String uploadsDir) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
        this.uploadsRoot = Path.of(uploadsDir).toAbsolutePath().normalize();
    }

    @Transactional
    public Map<String, Object> createVehicle(
            Map<String, String> data,
            List<MultipartFile> files,
            long actorId,
            HttpServletRequest request) {

        String placa = requiredText(data.get("placa"), "placa", 6, 10).toUpperCase();
        String categoria = requiredText(data.get("categoria"), "categoria", 1, 20);
        String marca = requiredText(data.get("marca"), "marca", 2, 50);
        String modelo = requiredText(data.get("modelo"), "modelo", 2, 50);
        String color = requiredText(data.get("color"), "color", 3, 30);

        Long companyId = optionalLong(data.get("company_id"), "El campo company_id debe ser numérico");

        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM vehicles WHERE placa = ?", Integer.class, placa);
        if (count != null && count > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La placa ya está registrada");
        }

        String tipoPropiedad = "particular".equalsIgnoreCase(data.get("tipo_propiedad")) ? "particular" : "empresa";
        String tipoServicio = optionalText(data.get("tipo_servicio"));
        Integer anoFabricacion = optionalInteger(data.get("ano_fabricacion"));
        String numeroVin = optionalText(data.get("numero_vin"));
        String numeroMotor = optionalText(data.get("numero_motor"));
        String combustible = optionalText(data.get("combustible"));
        String soatPoliza = optionalText(data.get("soat_poliza"));
        String soatAseguradora = optionalText(data.get("soat_aseguradora"));
        LocalDate soatVencimiento = optionalDate(data.get("soat_vencimiento"));
        String rtEntidad = optionalText(data.get("rt_entidad"));
        String rtCertificado = optionalText(data.get("rt_certificado"));
        LocalDate rtVencimiento = optionalDate(data.get("rt_vencimiento"));

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO vehicles (
                        company_id, tipo_propiedad, tipo_servicio, categoria, placa, marca, modelo, color,
                        ano_fabricacion, numero_vin, numero_motor, combustible,
                        soat_poliza, soat_aseguradora, soat_vencimiento,
                        rt_entidad, rt_certificado, rt_vencimiento, estado
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
                    """, Statement.RETURN_GENERATED_KEYS);
            if (companyId != null) ps.setLong(1, companyId); else ps.setNull(1, java.sql.Types.BIGINT);
            ps.setString(2, tipoPropiedad);
            ps.setString(3, tipoServicio);
            ps.setString(4, categoria);
            ps.setString(5, placa);
            ps.setString(6, marca);
            ps.setString(7, modelo);
            ps.setString(8, color);
            if (anoFabricacion != null) ps.setInt(9, anoFabricacion); else ps.setNull(9, java.sql.Types.INTEGER);
            ps.setString(10, numeroVin);
            ps.setString(11, numeroMotor);
            ps.setString(12, combustible);
            ps.setString(13, soatPoliza);
            ps.setString(14, soatAseguradora);
            if (soatVencimiento != null) ps.setDate(15, Date.valueOf(soatVencimiento)); else ps.setNull(15, java.sql.Types.DATE);
            ps.setString(16, rtEntidad);
            ps.setString(17, rtCertificado);
            if (rtVencimiento != null) ps.setDate(18, Date.valueOf(rtVencimiento)); else ps.setNull(18, java.sql.Types.DATE);
            return ps;
        }, keyHolder);

        Number generatedId = keyHolder.getKey();
        if (generatedId == null) {
            throw new IllegalStateException("No se pudo obtener el ID del vehículo registrado");
        }
        long vehicleId = generatedId.longValue();

        List<String> storedImages = processAndStoreImages(vehicleId, files, 0);

        auditService.record(actorId, "crear", "vehiculo", vehicleId,
                "Vehículo creado: " + placa, request);

        return Map.of(
                "id", vehicleId,
                "placa", placa,
                "images", storedImages);
    }

    @Transactional
    public Map<String, Object> updateVehicle(
            Map<String, Object> data,
            long actorId,
            HttpServletRequest request) {

        Long vehicleId = optionalLong(data.get("id"), "ID inválido");
        if (vehicleId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ID inválido");
        }

        List<Map<String, Object>> existing = jdbcTemplate.queryForList(
                "SELECT id, placa FROM vehicles WHERE id = ?", vehicleId);
        if (existing.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Vehículo no encontrado");
        }

        List<String> fields = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        for (String optionalFk : List.of("driver_id", "company_id")) {
            if (data.containsKey(optionalFk)) {
                Long fkValue = optionalLong(data.get(optionalFk), "El campo " + optionalFk + " debe ser numérico");
                fields.add(optionalFk + " = ?");
                params.add(fkValue);
            }
        }

        String newPlaca = optionalText(data.get("placa"));
        if (newPlaca != null) {
            newPlaca = newPlaca.toUpperCase();
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM vehicles WHERE placa = ? AND id <> ?",
                    Integer.class, newPlaca, vehicleId);
            if (count != null && count > 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "La placa ya está registrada");
            }
            fields.add("placa = ?");
            params.add(newPlaca);
        }

        addDirectField("marca", data, fields, params);
        addDirectField("modelo", data, fields, params);
        addDirectField("color", data, fields, params);
        addDirectField("categoria", data, fields, params);
        addDirectField("tipo_propiedad", data, fields, params);
        addDirectField("tipo_servicio", data, fields, params);
        addDirectField("numero_vin", data, fields, params);
        addDirectField("numero_motor", data, fields, params);
        addDirectField("combustible", data, fields, params);
        addDirectField("soat_poliza", data, fields, params);
        addDirectField("soat_aseguradora", data, fields, params);
        addDirectField("rt_entidad", data, fields, params);
        addDirectField("rt_certificado", data, fields, params);

        if (data.containsKey("ano_fabricacion")) {
            fields.add("ano_fabricacion = ?");
            params.add(optionalInteger(data.get("ano_fabricacion")));
        }
        if (data.containsKey("soat_vencimiento")) {
            LocalDate d = optionalDate(data.get("soat_vencimiento"));
            fields.add("soat_vencimiento = ?");
            params.add(d != null ? Date.valueOf(d) : null);
        }
        if (data.containsKey("rt_vencimiento")) {
            LocalDate d = optionalDate(data.get("rt_vencimiento"));
            fields.add("rt_vencimiento = ?");
            params.add(d != null ? Date.valueOf(d) : null);
        }
        if (data.containsKey("estado")) {
            String estado = text(data.get("estado"));
            if (!Set.of("activo", "inactivo").contains(estado)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Estado inválido");
            }
            fields.add("estado = ?");
            params.add(estado);
        }

        if (fields.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No hay campos para actualizar");
        }

        fields.add("updated_at = NOW()");
        params.add(vehicleId);

        jdbcTemplate.update(
                "UPDATE vehicles SET " + String.join(", ", fields) + " WHERE id = ?",
                params.toArray());

        auditService.record(actorId, "actualizar", "vehiculo", vehicleId,
                "Vehículo actualizado", request);

        return jdbcTemplate.queryForMap("SELECT * FROM vehicles WHERE id = ?", vehicleId);
    }

    @Transactional
    public Map<String, Object> uploadImages(
            long vehicleId,
            List<MultipartFile> files,
            long actorId,
            HttpServletRequest request) {

        List<Map<String, Object>> vRows = jdbcTemplate.queryForList(
                "SELECT id, placa, estado FROM vehicles WHERE id = ?", vehicleId);
        if (vRows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Vehículo no encontrado");
        }
        if (!"activo".equals(vRows.get(0).get("estado"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Solo se pueden subir imágenes a vehículos activos");
        }

        if (files == null || files.isEmpty() || files.stream().allMatch(MultipartFile::isEmpty)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Debe enviar al menos una imagen");
        }

        Integer existingImages = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM vehicle_images WHERE vehicle_id = ?", Integer.class, vehicleId);
        int currentCount = existingImages == null ? 0 : existingImages;

        long validFilesCount = files.stream().filter(f -> f != null && !f.isEmpty()).count();
        if (currentCount + validFilesCount > 4) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "El vehículo ya alcanzó el máximo de 4 imágenes");
        }

        List<String> stored = processAndStoreImages(vehicleId, files, currentCount);

        auditService.record(actorId, "subir_imagen_vehiculo", "vehiculo", vehicleId,
                "Imágenes cargadas para vehículo ID " + vehicleId, request);

        return Map.of(
                "vehicle_id", vehicleId,
                "images", stored);
    }

    private List<String> processAndStoreImages(long vehicleId, List<MultipartFile> files, int startSortOrder) {
        if (files == null || files.isEmpty()) {
            return List.of();
        }

        Path vehicleDir = uploadsRoot.resolve("vehicles").resolve(String.valueOf(vehicleId));
        try {
            Files.createDirectories(vehicleDir);
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo crear la carpeta de imágenes del vehículo", e);
        }

        List<String> stored = new ArrayList<>();
        int sortOrder = startSortOrder + 1;

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            if (sortOrder > 4) {
                break;
            }

            String originalName = file.getOriginalFilename() == null ? "imagen.jpg" : file.getOriginalFilename();
            String ext = getFileExtension(originalName);
            if (!ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
                continue;
            }

            String uniqueName = String.format("vehicle_%d_%s_%d.jpg",
                    vehicleId, UUID.randomUUID().toString().replace("-", "").substring(0, 10), sortOrder);
            Path destination = vehicleDir.resolve(uniqueName);

            try {
                byte[] compressedBytes = compressToJpeg(file, 800, 0.75f);
                Files.write(destination, compressedBytes);
                long fileSize = compressedBytes.length;
                String relativePath = "uploads/vehicles/" + vehicleId + "/" + uniqueName;

                jdbcTemplate.update("""
                        INSERT INTO vehicle_images (vehicle_id, file_name, file_path, mime_type, file_size, sort_order)
                        VALUES (?, ?, ?, 'image/jpeg', ?, ?)
                        """, vehicleId, originalName, relativePath, fileSize, sortOrder);

                stored.add(relativePath);
                sortOrder++;
            } catch (Exception e) {
                throw new IllegalStateException("Error al procesar y almacenar imagen: " + originalName, e);
            }
        }

        return stored;
    }

    private byte[] compressToJpeg(MultipartFile file, int maxWidth, float quality) throws IOException {
        try (InputStream in = file.getInputStream()) {
            BufferedImage original = ImageIO.read(in);
            if (original == null) {
                return file.getBytes();
            }

            int width = original.getWidth();
            int height = original.getHeight();

            if (width > maxWidth) {
                height = (int) (((double) height / width) * maxWidth);
                width = maxWidth;
            }

            BufferedImage rgb = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = rgb.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.drawImage(original, 0, 0, width, height, Color.WHITE, null);
            g.dispose();

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
            try (ImageOutputStream ios = ImageIO.createImageOutputStream(out)) {
                writer.setOutput(ios);
                ImageWriteParam param = writer.getDefaultWriteParam();
                if (param.canWriteCompressed()) {
                    param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                    param.setCompressionQuality(quality);
                }
                writer.write(null, new IIOImage(rgb, null, null), param);
            } finally {
                writer.dispose();
            }
            return out.toByteArray();
        }
    }

    private String getFileExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1) : "";
    }

    private void addDirectField(String field, Map<String, Object> data, List<String> fields, List<Object> params) {
        if (data.containsKey(field)) {
            fields.add(field + " = ?");
            params.add(optionalText(data.get(field)));
        }
    }

    private String requiredText(Object value, String fieldName, int min, int max) {
        String s = text(value);
        if (s.length() < min || s.length() > max) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Validación fallida: " + fieldName + " debe tener entre " + min + " y " + max + " caracteres");
        }
        return s;
    }

    private String optionalText(Object value) {
        String s = text(value);
        return s.isBlank() ? null : s;
    }

    private Long optionalLong(Object value, String errorMsg) {
        if (value == null || value.toString().isBlank()) return null;
        try {
            return Long.parseLong(value.toString().trim());
        } catch (NumberFormatException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, errorMsg);
        }
    }

    private Integer optionalInteger(Object value) {
        if (value == null || value.toString().isBlank()) return null;
        try {
            return Integer.parseInt(value.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private LocalDate optionalDate(Object value) {
        if (value == null || value.toString().isBlank()) return null;
        try {
            return LocalDate.parse(value.toString().trim());
        } catch (Exception e) {
            return null;
        }
    }

    private String text(Object value) {
        return value == null ? "" : value.toString().trim();
    }
}
