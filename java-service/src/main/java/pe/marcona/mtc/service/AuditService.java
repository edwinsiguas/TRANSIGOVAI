package pe.marcona.mtc.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;

@Service
public class AuditService {
    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final Path auditFile;

    public AuditService(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            @Value("${app.audit-file:logs/database-audit.jsonl}") String auditFile) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.auditFile = Path.of(auditFile).toAbsolutePath().normalize();
    }

    public void record(
            long actorId,
            String action,
            String entity,
            long entityId,
            String description,
            HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        try {
            jdbcTemplate.update("""
                    INSERT INTO action_logs (user_id, accion, entidad, entidad_id, descripcion, ip_address, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                    """, actorId, action, entity, entityId, description, ip);
        } catch (DataAccessException exception) {
            log.error("Could not insert the {} audit event into action_logs", action, exception);
        }

        var event = new LinkedHashMap<String, Object>();
        event.put("timestamp", OffsetDateTime.now().toString());
        event.put("user_id", actorId);
        event.put("action", action);
        event.put("entity", entity);
        event.put("entity_id", entityId);
        event.put("description", description);
        event.put("ip_address", ip);
        event.put("http_method", request.getMethod());
        event.put("endpoint", request.getRequestURI());

        try {
            String line = objectMapper.writeValueAsString(event) + System.lineSeparator();
            Files.createDirectories(auditFile.getParent());
            Files.writeString(auditFile, line, StandardOpenOption.CREATE, StandardOpenOption.WRITE, StandardOpenOption.APPEND);
        } catch (IOException exception) {
            log.error("Could not append an audit event to {}", auditFile, exception);
        }
    }
}
