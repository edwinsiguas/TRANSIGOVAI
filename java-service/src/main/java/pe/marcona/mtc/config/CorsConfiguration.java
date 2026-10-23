package pe.marcona.mtc.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;

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

    @Value("${app.uploads-dir:uploads}")
    private String uploadsDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path path = Path.of(uploadsDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + path.toString() + "/");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(origins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .maxAge(86_400);
    }

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public CorsFilter corsFilter() {
        var source = new UrlBasedCorsConfigurationSource();
        var config = new org.springframework.web.cors.CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOrigins(List.of(origins));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setMaxAge(86400L);
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }

    @Bean
    public org.springframework.boot.web.embedded.tomcat.TomcatConnectorCustomizer tomcatConnectorCustomizer() {
        return connector -> {
            connector.setMaxPartCount(200);
            connector.setMaxPartHeaderSize(4096);
            connector.setMaxParameterCount(10000);
        };
    }
}
