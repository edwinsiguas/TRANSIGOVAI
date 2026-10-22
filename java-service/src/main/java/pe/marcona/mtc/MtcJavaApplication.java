package pe.marcona.mtc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

/** Punto de entrada del módulo Java del sistema MTC Marcona. */
@SpringBootApplication
public class MtcJavaApplication {
    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(MtcJavaApplication.class);
        application.setDefaultProperties(loadDotEnvDefaults());
        application.run(args);
    }

    private static Map<String, Object> loadDotEnvDefaults() {
        Map<String, Object> defaults = new HashMap<>();
        Path workingDirectory = Path.of("").toAbsolutePath().normalize();
        for (Path file : new Path[] {
                workingDirectory.resolve("../.env"),
                workingDirectory.resolve("../api/.env"),
                workingDirectory.resolve(".env"),
                workingDirectory.resolve("api/.env")}) {
            if (!Files.isRegularFile(file)) {
                continue;
            }
            try {
                for (String line : Files.readAllLines(file)) {
                    String trimmed = line.trim();
                    if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                        continue;
                    }
                    int separator = trimmed.indexOf('=');
                    if (separator < 1) {
                        continue;
                    }
                    String key = trimmed.substring(0, separator).trim();
                    String value = trimmed.substring(separator + 1).trim();
                    if (value.length() >= 2
                            && ((value.startsWith("\"") && value.endsWith("\""))
                            || (value.startsWith("'") && value.endsWith("'")))) {
                        value = value.substring(1, value.length() - 1);
                    }
                    if (System.getenv(key) == null && !defaults.containsKey(key)) {
                        defaults.put(key, value);
                    }
                }
            } catch (IOException exception) {
                throw new IllegalStateException("No se pudo leer el archivo de configuración " + file, exception);
            }
        }
        return defaults;
    }
}
