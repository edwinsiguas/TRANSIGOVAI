package pe.marcona.mtc.service;

import pe.marcona.mtc.exception.ApiException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class PermitService {
    private static final Set<String> VALID_TYPES = Set.of(
            "libre_transito", "ruta_fija", "carga", "especial");

    private final JdbcTemplate jdbcTemplate;
    private final QrCodeService qrCodeService;
    private final AuditService auditService;
    private final String appUrl;
    private final String apiUrl;

    public PermitService(
            JdbcTemplate jdbcTemplate,
            QrCodeService qrCodeService,
            AuditService auditService,
            @Value("${APP_URL:http://localhost:3000}") String appUrl,
            @Value("${app.api-url:http://localhost/api}") String apiUrl) {
        this.jdbcTemplate = jdbcTemplate;
        this.qrCodeService = qrCodeService;
        this.auditService = auditService;
        this.appUrl = appUrl.replaceAll("/+$", "");
        this.apiUrl = apiUrl.replaceAll("/+$", "");
    }

    public Map<String, Object> listPermits(Map<String, String> query) {
        int page = positiveInt(query.get("page"), 1);
        int limit = positiveInt(query.get("limit"), 10);
        long offset = (long) (page - 1) * limit;

        List<String> conditions = new ArrayList<>();
        List<Object> params = new ArrayList<>();

        String search = text(query.get("search"));
        if (!search.isBlank()) {
            conditions.add("(p.numero_permiso LIKE ? OR d.nombre_completo LIKE ? OR v.placa LIKE ?)");
            String term = "%" + search + "%";
            params.add(term);
            params.add(term);
            params.add(term);
        }

        String estado = text(query.get("estado"));
        if (!estado.isBlank() && !"todos".equalsIgnoreCase(estado)) {
            conditions.add("p.estado = ?");
            params.add(estado);
        }

        addLongFilter(query, "vehicle_id", "p.vehicle_id", conditions, params);
        addLongFilter(query, "driver_id", "p.driver_id", conditions, params);
        addLongFilter(query, "company_id", "p.company_id", conditions, params);

        String expiringSoon = text(query.get("expiring_soon"));
        if ("1".equals(expiringSoon) || "true".equalsIgnoreCase(expiringSoon)) {
            conditions.add("p.estado IN ('vigente', 'vencido')");
            conditions.add("p.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)");
        }

        String where = conditions.isEmpty() ? "" : " WHERE " + String.join(" AND ", conditions);

        Long total = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM permits p
                JOIN vehicles v ON p.vehicle_id = v.id
                LEFT JOIN drivers d ON p.driver_id = d.id
                LEFT JOIN companies c ON p.company_id = c.id
                """ + where, Long.class, params.toArray());

        params.add(limit);
        params.add(offset);

        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT p.id, p.numero_permiso, p.tipo_permiso, p.fecha_emision,
                       p.fecha_vencimiento, p.estado, p.observaciones, p.qr_code,
                       p.numero_recibo, p.monto_pagado, p.vehicle_id, p.driver_id, p.company_id,
                       v.placa, v.marca, v.modelo, v.categoria,
                       d.nombre_completo, d.dni,
                       d.numero_licencia, d.fecha_vencimiento_licencia,
                       c.nombre AS empresa
                FROM permits p
                JOIN vehicles v ON p.vehicle_id = v.id
                LEFT JOIN drivers d ON p.driver_id = d.id
                LEFT JOIN companies c ON p.company_id = c.id
                """ + where + " ORDER BY p.created_at DESC LIMIT ? OFFSET ?", params.toArray())
                .stream().map(this::formatDates).toList();

        long count = total == null ? 0 : total;
        long pages = count == 0 ? 0 : (count + limit - 1) / limit;

        return Map.of(
                "data", rows,
                "pagination", Map.of(
                        "page", page,
                        "limit", limit,
                        "total", count,
                        "pages", pages));
    }

    public Map<String, Object> getPermitById(long id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT p.*,
                       v.placa, v.marca, v.modelo, v.categoria,
                       v.soat_vencimiento, v.rt_vencimiento,
                       d.nombre_completo, d.dni,
                       d.numero_licencia, d.fecha_vencimiento_licencia,
                       c.nombre AS empresa
                FROM permits p
                JOIN vehicles v ON p.vehicle_id = v.id
                LEFT JOIN drivers d ON p.driver_id = d.id
                LEFT JOIN companies c ON p.company_id = c.id
                WHERE p.id = ?
                """, id);

        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Permiso " + id + " no encontrado");
        }
        return formatDates(rows.get(0));
    }

    @Transactional
    public Map<String, Object> generatePermit(Map<String, Object> input, long actorId, jakarta.servlet.http.HttpServletRequest request) {
        long vehicleId = parsePositiveLong(input.get("vehicle_id"), "vehicle_id es obligatorio");
        String fechaVencimientoStr = text(input.get("fecha_vencimiento"));
        if (fechaVencimientoStr.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "fecha_vencimiento es obligatoria");
        }

        LocalDate fechaVencimiento;
        try {
            fechaVencimiento = LocalDate.parse(fechaVencimientoStr);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Fecha de vencimiento inválida (formato YYYY-MM-DD)");
        }

        if (!fechaVencimiento.isAfter(LocalDate.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha de vencimiento debe ser posterior a hoy");
        }

        String tipoPermiso = text(input.getOrDefault("tipo_permiso", "libre_transito"));
        if (!VALID_TYPES.contains(tipoPermiso)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Tipo de permiso inválido. Use: " + String.join(", ", VALID_TYPES));
        }

        List<Map<String, Object>> vehicleRows = jdbcTemplate.queryForList(
                "SELECT id, company_id, estado FROM vehicles WHERE id = ?", vehicleId);
        if (vehicleRows.isEmpty() || !"activo".equals(vehicleRows.get(0).get("estado"))) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Vehículo no encontrado o inactivo");
        }
        Map<String, Object> vehicle = vehicleRows.get(0);
        Long companyId = vehicle.get("company_id") == null ? null : ((Number) vehicle.get("company_id")).longValue();

        List<Map<String, Object>> assignmentRows = jdbcTemplate.queryForList("""
                SELECT va.*, d.nombre_completo, d.dni, d.fecha_vencimiento_licencia, d.estado AS estado_conductor
                FROM vehicle_assignments va
                JOIN drivers d ON va.driver_id = d.id
                WHERE va.vehicle_id = ? AND va.activo = 1
                """, vehicleId);

        if (assignmentRows.isEmpty()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "El vehículo no tiene un conductor asignado. Asigne un conductor primero.");
        }

        Map<String, Object> assignment = assignmentRows.get(0);
        long assignmentId = ((Number) assignment.get("id")).longValue();
        long driverId = ((Number) assignment.get("driver_id")).longValue();

        LocalDate licenciaVence = asLocalDate(assignment.get("fecha_vencimiento_licencia"));
        if (licenciaVence != null && licenciaVence.isBefore(LocalDate.now())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "La licencia del conductor " + assignment.get("nombre_completo") + " está vencida. Actualícela primero.");
        }

        Integer existingActive = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM permits
                WHERE assignment_id = ? AND estado = 'vigente' AND fecha_vencimiento >= CURDATE()
                """, Integer.class, assignmentId);

        if (existingActive != null && existingActive > 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Ya existe un permiso vigente para este vehículo con el conductor actual");
        }

        String numeroPermiso = generateNextPermitNumber();
        String qrData = appUrl + "/tuc/" + numeroPermiso;
        String qrCode = qrCodeService.generateBase64Qr(qrData);

        String observaciones = text(input.get("observaciones"));
        String numeroRecibo = optionalText(input.get("numero_recibo"));
        BigDecimal montoPagado = parseBigDecimal(input.get("monto_pagado"));

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO permits
                        (assignment_id, vehicle_id, driver_id, company_id, numero_permiso,
                         tipo_permiso, fecha_emision, fecha_vencimiento, observaciones, qr_code,
                         estado, created_by, numero_recibo, monto_pagado)
                    VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, 'vigente', ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, assignmentId);
            ps.setLong(2, vehicleId);
            ps.setLong(3, driverId);
            if (companyId != null) ps.setLong(4, companyId); else ps.setNull(4, java.sql.Types.BIGINT);
            ps.setString(5, numeroPermiso);
            ps.setString(6, tipoPermiso);
            ps.setDate(7, Date.valueOf(fechaVencimiento));
            ps.setString(8, observaciones);
            ps.setString(9, qrCode);
            ps.setLong(10, actorId);
            ps.setString(11, numeroRecibo);
            if (montoPagado != null) ps.setBigDecimal(12, montoPagado); else ps.setNull(12, java.sql.Types.DECIMAL);
            return ps;
        }, keyHolder);

        Number generatedId = keyHolder.getKey();
        if (generatedId == null) {
            throw new IllegalStateException("No se pudo obtener el ID del permiso generado");
        }
        long permitId = generatedId.longValue();

        auditService.record(actorId, "generar_permiso", "permiso", permitId,
                "Permiso generado: " + numeroPermiso, request);

        return getPermitById(permitId);
    }

    @Transactional
    public boolean revokePermit(long permitId, String motivo, long actorId, jakarta.servlet.http.HttpServletRequest request) {
        String cleanMotivo = motivo == null || motivo.isBlank() ? "Revocado por administrador" : motivo.trim();

        int rows = jdbcTemplate.update("""
                UPDATE permits
                SET estado = 'revocado',
                    observaciones = CONCAT(COALESCE(observaciones, ''), ' | REVOCADO: ', ?)
                WHERE id = ? AND estado = 'vigente'
                """, cleanMotivo, permitId);

        if (rows > 0) {
            auditService.record(actorId, "revocar_permiso", "permiso", permitId, cleanMotivo, request);
            return true;
        }
        return false;
    }

    @Transactional
    public Map<String, Object> renewPermit(long oldPermitId, Map<String, Object> input, long actorId, jakarta.servlet.http.HttpServletRequest request) {
        Map<String, Object> oldPermit = getPermitById(oldPermitId);

        if ("revocado".equals(oldPermit.get("estado"))) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "No se puede renovar un permiso revocado");
        }

        long vehicleId = ((Number) oldPermit.get("vehicle_id")).longValue();
        long driverId = ((Number) oldPermit.get("driver_id")).longValue();
        Long assignmentId = oldPermit.get("assignment_id") == null ? null : ((Number) oldPermit.get("assignment_id")).longValue();
        Long companyId = oldPermit.get("company_id") == null ? null : ((Number) oldPermit.get("company_id")).longValue();

        List<Map<String, Object>> vRows = jdbcTemplate.queryForList(
                "SELECT * FROM vehicles WHERE id = ?", vehicleId);
        if (vRows.isEmpty() || !"activo".equals(vRows.get(0).get("estado"))) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "El vehículo está inactivo");
        }
        Map<String, Object> vehicle = vRows.get(0);

        LocalDate soatVence = asLocalDate(vehicle.get("soat_vencimiento"));
        if (soatVence == null || soatVence.isBefore(LocalDate.now())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "El vehículo no tiene SOAT vigente");
        }

        LocalDate rtVence = asLocalDate(vehicle.get("rt_vencimiento"));
        if (rtVence == null || rtVence.isBefore(LocalDate.now())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "El vehículo no tiene Revisión Técnica vigente");
        }

        List<Map<String, Object>> dRows = jdbcTemplate.queryForList(
                "SELECT * FROM drivers WHERE id = ?", driverId);
        if (dRows.isEmpty()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Conductor no encontrado");
        }
        Map<String, Object> driver = dRows.get(0);

        LocalDate licenciaVence = asLocalDate(driver.get("fecha_vencimiento_licencia"));
        if (licenciaVence == null || licenciaVence.isBefore(LocalDate.now())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "La licencia del conductor está vencida");
        }

        if (assignmentId != null) {
            Integer activeCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM vehicle_assignments WHERE id = ? AND activo = 1", Integer.class, assignmentId);
            if (activeCount == null || activeCount == 0) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "La asignación vinculada a este permiso ya no está activa");
            }
        }

        jdbcTemplate.update("UPDATE permits SET estado = 'renovado' WHERE id = ?", oldPermitId);

        LocalDate newVencimiento = LocalDate.now().plusYears(1);
        String numeroPermiso = generateNextPermitNumber();
        String qrData = appUrl + "/tuc/" + numeroPermiso;
        String qrCode = qrCodeService.generateBase64Qr(qrData);

        String obsInput = text(input.get("observaciones"));
        final String cleanObservaciones = obsInput.isBlank()
                ? "Renovación de permiso " + oldPermit.get("numero_permiso")
                : obsInput;
        String numeroRecibo = optionalText(input.get("numero_recibo"));
        BigDecimal montoPagado = parseBigDecimal(input.get("monto_pagado"));
        String tipoPermiso = String.valueOf(oldPermit.getOrDefault("tipo_permiso", "libre_transito"));

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO permits
                        (assignment_id, vehicle_id, driver_id, company_id, numero_permiso,
                         tipo_permiso, fecha_emision, fecha_vencimiento, observaciones, qr_code,
                         estado, created_by, numero_recibo, monto_pagado)
                    VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, 'vigente', ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            if (assignmentId != null) ps.setLong(1, assignmentId); else ps.setNull(1, java.sql.Types.BIGINT);
            ps.setLong(2, vehicleId);
            ps.setLong(3, driverId);
            if (companyId != null) ps.setLong(4, companyId); else ps.setNull(4, java.sql.Types.BIGINT);
            ps.setString(5, numeroPermiso);
            ps.setString(6, tipoPermiso);
            ps.setDate(7, Date.valueOf(newVencimiento));
            ps.setString(8, cleanObservaciones);
            ps.setString(9, qrCode);
            ps.setLong(10, actorId);
            ps.setString(11, numeroRecibo);
            if (montoPagado != null) ps.setBigDecimal(12, montoPagado); else ps.setNull(12, java.sql.Types.DECIMAL);
            return ps;
        }, keyHolder);

        Number generatedId = keyHolder.getKey();
        if (generatedId == null) {
            throw new IllegalStateException("No se pudo obtener el ID del permiso renovado");
        }
        long newPermitId = generatedId.longValue();

        auditService.record(actorId, "renovar_permiso", "permiso", newPermitId,
                "Permiso renovado a partir del ID " + oldPermitId, request);

        return getPermitById(newPermitId);
    }

    public List<Map<String, Object>> getVehicleImages(long vehicleId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT file_path, sort_order
                FROM vehicle_images
                WHERE vehicle_id = ?
                ORDER BY sort_order ASC, id ASC
                LIMIT 2
                """, vehicleId);

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            String path = String.valueOf(r.get("file_path")).replaceFirst("^/+", "");
            result.add(Map.of(
                    "url", apiUrl + "/" + path,
                    "sort_order", ((Number) r.get("sort_order")).intValue()));
        }
        return result;
    }

    @Transactional
    public List<Long> markExpired(long actorId, jakarta.servlet.http.HttpServletRequest request) {
        List<Long> expiredIds = jdbcTemplate.queryForList("""
                SELECT id FROM permits
                WHERE estado = 'vigente' AND fecha_vencimiento < CURDATE()
                FOR UPDATE
                """, Long.class);

        if (expiredIds.isEmpty()) {
            return List.of();
        }

        for (Long id : expiredIds) {
            jdbcTemplate.update("UPDATE permits SET estado = 'vencido' WHERE id = ?", id);
            auditService.record(actorId, "vencimiento_automatico", "permiso", id,
                    "Permiso vencido automáticamente por fecha de vencimiento", request);
        }

        return expiredIds;
    }

    @Transactional
    public synchronized String generateNextPermitNumber() {
        int year = Year.now().getValue();
        jdbcTemplate.update(
                "INSERT IGNORE INTO permit_sequences (year, last_number) VALUES (?, 0)", year);
        jdbcTemplate.update(
                "UPDATE permit_sequences SET last_number = last_number + 1 WHERE year = ?", year);
        Integer seq = jdbcTemplate.queryForObject(
                "SELECT last_number FROM permit_sequences WHERE year = ?", Integer.class, year);
        int sequenceNum = seq == null ? 1 : seq;
        return String.format("PERM-%d-%05d", year, sequenceNum);
    }

    private Map<String, Object> formatDates(Map<String, Object> row) {
        var output = new LinkedHashMap<String, Object>(row);
        output.replaceAll((key, value) -> {
            if (value instanceof Timestamp timestamp) {
                return timestamp.toLocalDateTime().toString().replace('T', ' ');
            }
            if (value instanceof Date date) {
                return date.toLocalDate().toString();
            }
            return value;
        });
        return output;
    }

    private LocalDate asLocalDate(Object value) {
        if (value instanceof Date date) return date.toLocalDate();
        if (value instanceof LocalDate localDate) return localDate;
        if (value != null && !value.toString().isBlank()) {
            try {
                return LocalDate.parse(value.toString());
            } catch (Exception ignored) { }
        }
        return null;
    }

    private BigDecimal parseBigDecimal(Object value) {
        if (value == null || value.toString().isBlank()) return null;
        try {
            return new BigDecimal(value.toString().trim());
        } catch (Exception e) {
            return null;
        }
    }

    private long parsePositiveLong(Object value, String errorMsg) {
        if (value == null) throw new ApiException(HttpStatus.BAD_REQUEST, errorMsg);
        try {
            long parsed = Long.parseLong(value.toString().trim());
            if (parsed <= 0) throw new ApiException(HttpStatus.BAD_REQUEST, errorMsg);
            return parsed;
        } catch (NumberFormatException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, errorMsg);
        }
    }

    private void addLongFilter(Map<String, String> query, String key, String col, List<String> conditions, List<Object> params) {
        String val = text(query.get(key));
        if (!val.isBlank()) {
            try {
                params.add(Long.parseLong(val));
                conditions.add(col + " = ?");
            } catch (NumberFormatException ignored) { }
        }
    }

    private int positiveInt(String val, int fallback) {
        if (val == null || val.isBlank()) return fallback;
        try {
            return Math.max(1, Integer.parseInt(val));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private String text(Object val) {
        return val == null ? "" : val.toString().trim();
    }

    private String optionalText(Object val) {
        String s = text(val);
        return s.isBlank() ? null : s;
    }
}
