package pe.marcona.mtc;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class CorsConfiguration implements WebMvcConfigurer {
    private final String[] origins;

    public CorsConfiguration(
            @Value("${CORS_ALLOWED_ORIGINS:}") String configuredOrigins,
            @Value("${APP_ENV:development}") String environment,
            @Value("${APP_URL:http://localhost:3000}") String appUrl) {
        if (!configuredOrigins.isBlank()) {
            origins = Arrays.stream(configuredOrigins.split(",")).map(String::trim)
                    .filter(origin -> !origin.isEmpty()).toArray(String[]::new);
        } else if ("production".equalsIgnoreCase(environment)) {
            origins = new String[] {appUrl};
        } else {
            origins = new String[] {
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    "http://localhost:5173",
                    "http://127.0.0.1:5173"
            };
        }
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(origins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type", "Authorization", "X-Auth-Token")
                .maxAge(86_400);
    }
}
