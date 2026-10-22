package pe.marcona.mtc;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class LegacyTokenServiceTest {
    private final LegacyTokenService tokenService =
            new LegacyTokenService(new ObjectMapper(), "test-secret", 3600, "test");

    @Test
    void generatesVerifiableTokensUsingLegacyStandardBase64Segments() {
        String token = tokenService.generate(42, "admin");

        assertThat(tokenService.verify(token))
                .containsEntry("user_id", 42)
                .containsEntry("role", "admin");
        assertThat(token.split("\\.", -1)).hasSize(3);
    }

    @Test
    void rejectsTamperedTokens() {
        String token = tokenService.generate(42, "admin");
        String[] parts = token.split("\\.", -1);
        String tampered = parts[0] + "." + parts[1] + ".AAAA";

        assertThat(tokenService.verify(tampered)).isNull();
    }

    @Test
    void acceptsExistingPhpTokensWithStringUserIds() throws Exception {
        Base64.Encoder encoder = Base64.getEncoder();
        String header = encoder.encodeToString(
                "{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = encoder.encodeToString(("""
                {"user_id":"42","role":"admin","iat":%d,"exp":%d}
                """.formatted(Instant.now().getEpochSecond(), Instant.now().plusSeconds(3600).getEpochSecond()))
                .getBytes(StandardCharsets.UTF_8));
        String content = header + "." + payload;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("test-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String token = content + "." + encoder.encodeToString(mac.doFinal(content.getBytes(StandardCharsets.UTF_8)));

        assertThat(tokenService.verify(token)).containsEntry("user_id", "42");
    }

    @Test
    void passwordEncoderAcceptsPhpBcryptHashPrefix() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
        String hash = encoder.encode("password-example");
        String phpCompatibleHash = hash.replaceFirst("^\\$2a\\$", "\\$2y\\$");

        assertThat(encoder.matches("password-example", phpCompatibleHash)).isTrue();
    }
}
