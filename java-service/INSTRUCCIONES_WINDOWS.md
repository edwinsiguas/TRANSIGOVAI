# Módulo Java para MTC Marcona (Windows)

## Qué se añadió
- Servicio REST con Spring Boot (Java 25 LTS) para autenticación, usuarios y reportes.
- Migración inicial de login, logout, verificación de token y administración de usuarios; las demás rutas siguen en PHP.
- Acceso JDBC a MySQL/MariaDB, compatibilidad con hashes BCrypt de PHP y emisión de tokens compatibles.
- Registro de las acciones migradas en `action_logs` y `api/storage/logs/database-audit.jsonl`.
- Apache POI: genera archivos Excel `.xlsx` a partir de registros JSON.
- Google Guava: copia inmutable de registros.
- Apache Commons Lang: saneamiento de títulos.
- Commons IO y Commons Codec: disponibles como dependencias del módulo para utilidades futuras.
- Logback: registra actividad en consola y en `logs/mtc-java.log`.

## Requisitos
1. Instalar un JDK 25 LTS.
2. Instalar Apache Maven 3.9+ y verificar en CMD: `java -version` y `mvn -version`.
3. Tener MySQL/MariaDB iniciado y la base de datos creada con `scripts/setup.sql`.
4. Conexión a internet la primera vez para descargar dependencias Maven.

## Ejecutar
1. Configura las mismas credenciales `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS` y `DB_NAME` que usa PHP. Java lee `.env` desde la raíz del proyecto o `api/`, o variables del entorno.
2. Conserva el mismo `JWT_SECRET` en Java y PHP para que ambos servicios puedan validar las mismas sesiones.
3. Abre CMD o PowerShell dentro de `java-service`.
4. Ejecuta: `mvn spring-boot:run`
5. Comprueba el servicio en: `http://localhost:8081/api/health`

Para comprobar el módulo y sus pruebas automatizadas antes de iniciarlo, ejecuta `mvn test`.

No uses el secreto de ejemplo en producción. Si `APP_ENV=production` y se conserva el secreto predeterminado, Java no inicia.

## Rutas migradas al backend Java

La interfaz envía estas operaciones al servicio Java mediante `VITE_JAVA_API_URL` (por defecto `http://localhost:8081/api`):

- `POST /api/auth/login.php`
- `POST /api/auth/logout.php`
- `POST /api/auth/verify-token.php`
- `GET /api/users/list.php`
- `POST /api/users/create.php`
- `POST /api/users/update.php`
- `/api/companies/*.php`: CRUD y cambio de estado
- `/api/drivers/*.php`: CRUD de choferes
- `/api/stats/*` y `/api/assignments/*`
- `/api/verifications/*.php`
- `GET /api/vehicles/list.php` y `PUT /api/vehicles/toggle-status.php`

Se conservan los nombres de ruta y la respuesta JSON `{ "success": ..., "data": ..., "message": ... }`. PHP sigue activo para permisos, exportaciones y operaciones de vehículos aún no migradas. El frontend usa `VITE_JAVA_API_URL` para las rutas Java y `VITE_API_URL` para las rutas PHP.

## Probar generación de Excel en Windows
Desde la carpeta `java-service`, ejecuta en CMD:

```bat
curl.exe -X POST "http://localhost:8081/api/reportes/excel" -H "Content-Type: application/json" --data-binary "@examples/reporte-ejemplo.json" --output reporte-ejemplo.xlsx
```

Se creará `reporte-ejemplo.xlsx` en la carpeta actual.
El servicio responde con un archivo `.xlsx`; si los datos no son válidos, responde con HTTP 400 y un mensaje de texto explicativo. Se admiten hasta 10 000 registros, 16 384 columnas y 32 767 caracteres por celda.

## Integración con la interfaz web
El endpoint para generar Excel es `POST http://localhost:8081/api/reportes/excel`. Envía JSON con esta forma:

```json
{
  "titulo": "Reporte de vehículos",
  "registros": [
    {"placa": "ABC-123", "empresa": "Empresa de ejemplo", "permiso": "Vigente"}
  ]
}
```

La respuesta es un archivo Excel binario, no JSON. Desde el frontend se puede usar `fetch`, convertir la respuesta con `response.blob()` y crear un enlace de descarga. No envíes claves, contraseñas ni datos personales innecesarios.
Para desarrollo, el servicio permite solicitudes desde `http://localhost:5173` (Vite) y `http://localhost:3000`. En producción, configura `APP_URL` o `CORS_ALLOWED_ORIGINS` con los orígenes reales autorizados.

Los reportes de Empresas, Conductores, Permisos y Vehículos obtienen sus filas desde endpoints de exportación PHP y luego envían esas filas al generador Excel Java. Para probar esos cuatro flujos localmente también inicia PHP con `php -S localhost:8000 server.php` desde la raíz y configura `VITE_API_URL=http://localhost:8000/api`. El reporte de Historial obtiene sus estadísticas desde Java. En servidores distintos, comparte la misma base de datos para centralizar `action_logs`; el JSONL de auditoría es local a cada servidor salvo que `APP_AUDIT_FILE` apunte a un volumen compartido.

## Alcance del porcentaje Java
El backend Java supera el 50 % por líneas de código productivo Java frente a PHP de la API. La cifra no representa el porcentaje global del repositorio y depende del método de conteo descrito en `../javaagregados.md`. El proyecto aún requiere ejecutar pruebas de integración contra MySQL antes del despliegue.
