package pe.marcona.mtc.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class StatisticsService {
    private static final List<String> MONTHS = List.of(
            "Ene", "Feb", "Mar", "Abr", "May", "Jun",
            "Jul", "Ago", "Sep", "Oct", "Nov", "Dic");
    private static final List<String> COLORS = List.of(
            "#0A2342", "#3B82F6", "#93C5FD", "#F59E0B", "#10B981");

    private final JdbcTemplate jdbcTemplate;

    public StatisticsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> dashboard() {
        long vehicles = count("SELECT COUNT(*) FROM vehicles");
        long companies = count("SELECT COUNT(*) FROM companies");
        long drivers = count("SELECT COUNT(*) FROM drivers");
        long permitsActive = count("SELECT COUNT(*) FROM permits WHERE estado = 'vigente'");
        long permitsExpiring = count("""
                SELECT COUNT(*) FROM permits
                WHERE estado = 'vigente'
                  AND fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                """);
        long activeVehicles = count("SELECT COUNT(*) FROM vehicles WHERE estado = 'activo'");
        long inactiveVehicles = count("SELECT COUNT(*) FROM vehicles WHERE estado = 'inactivo'");
        List<Map<String, Object>> applications = jdbcTemplate.query("""
                SELECT MONTH(created_at) AS month_number, COUNT(id) AS aprobados
                FROM permits
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                GROUP BY MONTH(created_at)
                ORDER BY MONTH(created_at) ASC
                """, (rs, row) -> Map.of(
                "name", MONTHS.get(rs.getInt("month_number") - 1).toUpperCase(Locale.ROOT),
                "aprobados", rs.getLong("aprobados")));

        return Map.of(
                "vehicles", vehicles,
                "companies", companies,
                "drivers", drivers,
                "permits_active", permitsActive,
                "permits_expiring", permitsExpiring,
                "inspections_today", 0,
                "flota_chart", List.of(
                        Map.of("name", "Habilitados", "value", activeVehicles),
                        Map.of("name", "Suspendidos", "value", inactiveVehicles)),
                "tramites_chart", applications,
                "recent_activity", List.of(Map.of(
                        "id", 1, "action", "Registro de la plataforma inicial",
                        "time", "Recién", "type", "system", "user", "Admin", "initials", "AD")),
                "upcoming_expirations", List.of());
    }

    public Map<String, Object> companies() {
        long vehicles = count("SELECT COUNT(*) FROM vehicles");
        long activeCompanies = count("SELECT COUNT(*) FROM companies WHERE estado = 'activo'");
        long expiring = count("""
                SELECT COUNT(*) FROM permits
                WHERE estado = 'vigente'
                  AND fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                """);
        return Map.of("vehicles", vehicles, "rutas", activeCompanies * 2, "proximos", expiring);
    }

    public Map<String, Object> analytics() {
        long activeFleet = count("SELECT COUNT(*) FROM vehicles WHERE estado = 'activo'");
        long soatValid = count("""
                SELECT COUNT(*) FROM vehicles
                WHERE estado = 'activo' AND soat_vencimiento >= CURDATE()
                """);
        long procedures = count("""
                SELECT COUNT(*) FROM permits
                WHERE MONTH(created_at) = MONTH(CURDATE())
                  AND YEAR(created_at) = YEAR(CURDATE())
                """);
        long activeCompanies = count("SELECT COUNT(*) FROM companies WHERE estado = 'activo'");
        double soatPercent = activeFleet == 0 ? 0 : Math.round((double) soatValid / activeFleet * 1000) / 10.0;
        Map<String, Object> kpiData = Map.of(
                "flota_autorizada", activeFleet,
                "cumplimiento_soat", soatPercent,
                "tramites_proceso", procedures,
                "empresas_activas", activeCompanies);

        long rtValid = count("""
                SELECT COUNT(*) FROM vehicles
                WHERE estado = 'activo' AND rt_vencimiento >= CURDATE()
                """);
        long activeDrivers = count("SELECT COUNT(*) FROM drivers WHERE estado = 'activo'");
        long validLicenses = count("""
                SELECT COUNT(*) FROM drivers
                WHERE estado = 'activo' AND fecha_vencimiento_licencia >= CURDATE()
                """);
        Map<String, Object> documentation = Map.of(
                "soat", Map.of("valid", soatValid, "total", activeFleet),
                "rt", Map.of("valid", rtValid, "total", activeFleet),
                "licencias", Map.of("valid", validLicenses, "total", activeDrivers));

        List<Map<String, Object>> growthData = growth();
        List<Map<String, Object>> serviceData = serviceTypes();
        List<Map<String, Object>> rankingData = ranking();
        return Map.of(
                "kpis", kpiData,
                "documentation", documentation,
                "growthData", growthData,
                "serviceData", serviceData,
                "rankingData", rankingData);
    }

    private List<Map<String, Object>> growth() {
        List<Map<String, Object>> rows = jdbcTemplate.query("""
                SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key,
                       categoria, COUNT(id) AS total
                FROM vehicles
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
                GROUP BY month_key, categoria
                ORDER BY month_key ASC
                """, (rs, row) -> Map.of(
                "month_key", rs.getString("month_key"),
                "categoria", rs.getString("categoria"),
                "total", rs.getLong("total")));

        Map<String, Map<String, Object>> buckets = new LinkedHashMap<>();
        List<Map<String, Object>> months = jdbcTemplate.query("""
                SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL seq MONTH), '%Y-%m') AS month_key
                FROM (
                    SELECT 5 AS seq UNION ALL SELECT 4 UNION ALL SELECT 3
                    UNION ALL SELECT 2 UNION ALL SELECT 1 UNION ALL SELECT 0
                ) months
                ORDER BY seq DESC
                """, (rs, row) -> Map.of(
                "month_key", rs.getString("month_key")));
        for (Map<String, Object> month : months) {
            String key = String.valueOf(month.get("month_key"));
            YearMonth yearMonth = YearMonth.parse(key);
            String name = MONTHS.get(yearMonth.getMonthValue() - 1).toUpperCase(Locale.ROOT);
            buckets.put(key, new LinkedHashMap<>(Map.of(
                    "name", name,
                    "vehiculos", 0L,
                    "mototaxis", 0L)));
        }
        for (Map<String, Object> row : rows) {
            Map<String, Object> bucket = buckets.get(String.valueOf(row.get("month_key")));
            if (bucket == null) {
                continue;
            }
            String property = "moto-taxi".equalsIgnoreCase(String.valueOf(row.get("categoria")))
                    ? "mototaxis" : "vehiculos";
            long current = ((Number) bucket.get(property)).longValue();
            bucket.put(property, current + ((Number) row.get("total")).longValue());
        }
        return new ArrayList<>(buckets.values());
    }

    private List<Map<String, Object>> serviceTypes() {
        return jdbcTemplate.query("""
                SELECT tipo_servicio, COUNT(id) AS total
                FROM vehicles
                WHERE estado = 'activo' AND tipo_servicio IS NOT NULL AND tipo_servicio <> ''
                GROUP BY tipo_servicio
                """, (rs, row) -> {
            int index = row % COLORS.size();
            String name = rs.getString("tipo_servicio");
            return Map.of(
                    "name", name.isEmpty() ? name : name.substring(0, 1).toUpperCase() + name.substring(1),
                    "value", rs.getLong("total"),
                    "color", COLORS.get(index));
        });
    }

    private List<Map<String, Object>> ranking() {
        return jdbcTemplate.query("""
                SELECT c.id, c.nombre, c.ruc, COUNT(v.id) AS fleet,
                       SUM(CASE WHEN v.soat_vencimiento >= CURDATE() THEN 1 ELSE 0 END) AS valid_soat
                FROM companies c
                JOIN vehicles v ON v.company_id = c.id
                WHERE v.estado = 'activo'
                GROUP BY c.id, c.nombre, c.ruc
                ORDER BY fleet DESC
                LIMIT 5
                """, (rs, row) -> {
            long fleet = rs.getLong("fleet");
            long valid = rs.getLong("valid_soat");
            int compliance = fleet == 0 ? 0 : (int) Math.round((double) valid / fleet * 100);
            String name = rs.getString("nombre");
            return Map.of(
                    "name", name,
                    "ruc", rs.getString("ruc"),
                    "flota", fleet,
                    "categoria", "Transporte",
                    "cumplimiento", compliance,
                    "isWarning", compliance < 80,
                    "logo", name.substring(0, Math.min(2, name.length())).toUpperCase());
        });
    }

    private long count(String sql) {
        Long result = jdbcTemplate.queryForObject(sql, Long.class);
        return result == null ? 0 : result;
    }
}
