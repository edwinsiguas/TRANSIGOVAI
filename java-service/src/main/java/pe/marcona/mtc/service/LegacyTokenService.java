package pe.marcona.mtc.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.GeneralSecurityException;
import java.io.IOException;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class LegacyTokenService {
    private static final String HMAC_SHA256 = "HmacSHA256";
    private static final Base64.Encoder ENCODER = Base64.getEncoder();
    private static final Base64.Decoder DECODER = Base64.getDecoder();

    private final ObjectMapper objectMapper;
    private final byte[] secret;
    private final long expirySeconds;

    public LegacyTokenService(
            ObjectMapper objectMapper,
            @Value("${app.jwt-secret}") String secret,
            @Value("${app.jwt-expiry-seconds:86400}") long expirySeconds,
            @Value("${app.environment:development}") String environment) {
        if (secret.isBlank() || ("dev_only_change_me".equals(secret) && "production".equalsIgnoreCase(environment))) {
            throw new IllegalStateException("Configure JWT_SECRET antes de iniciar Java en producción.");
        }
        if (expirySeconds < 1) {
            throw new IllegalArgumentException("JWT_EXPIRY debe ser mayor que cero.");
        }
        this.objectMapper = objectMapper;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.expirySeconds = expirySeconds;
    }

    public String generate(long userId, String role) {
        try {
            String header = encode(Map.of("alg", "HS256", "typ", "JWT"));
            var claims = new LinkedHashMap<String, Object>();
            claims.put("user_id", userId);
            claims.put("role", role);
            claims.put("iat", Instant.now().getEpochSecond());
            claims.put("exp", Instant.now().getEpochSecond() + expirySeconds);
            String payload = encode(claims);
            String content = header + "." + payload;
            return content + "." + ENCODER.encodeToString(sign(content));
        } catch (JsonProcessingException | GeneralSecurityException exception) {
            throw new IllegalStateException("No se pudo generar el token de sesión.", exception);
        }
    }

    public Map<String, Object> verify(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }

        String[] parts = token.split("\\.", -1);
        if (parts.length != 3) {
            return null;
        }

        try {
            byte[] suppliedSignature = DECODER.decode(parts[2]);
            byte[] expectedSignature = sign(parts[0] + "." + parts[1]);
            if (!MessageDigest.isEqual(expectedSignature, suppliedSignature)) {
                return null;
            }

            var claims = objectMapper.readValue(DECODER.decode(parts[1]), new TypeReference<Map<String, Object>>() {});
            Object expiration = claims.get("exp");
            Object userId = claims.get("user_id");
            if (!(expiration instanceof Number expiry)
                    || expiry.longValue() < Instant.now().getEpochSecond()
                    || (!(userId instanceof Number)
                    && !(userId instanceof String id && id.matches("\\d+")))) {
                return null;
            }
            return claims;
        } catch (IllegalArgumentException | IOException | GeneralSecurityException exception) {
            return null;
        }
    }

    private String encode(Object value) throws JsonProcessingException {
        return ENCODER.encodeToString(objectMapper.writeValueAsBytes(value));
    }

    private byte[] sign(String content) throws GeneralSecurityException {
        Mac mac = Mac.getInstance(HMAC_SHA256);
        mac.init(new SecretKeySpec(secret, HMAC_SHA256));
        return mac.doFinal(content.getBytes(StandardCharsets.UTF_8));
    }
}
