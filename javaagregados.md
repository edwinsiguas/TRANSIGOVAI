# Cambios Java del backend — Sistema MTC Marcona

## Resultado

El backend supera el objetivo de **50 % de Java** con el criterio de conteo de líneas fuente descrito abajo. Se migraron módulos funcionales, se mantuvieron las rutas y respuestas usadas por la interfaz y se retiraron las implementaciones PHP sustituidas. La estructura de carpetas del proyecto no se movió.

| Lenguaje de backend | Líneas no vacías | Proporción |
|---|---:|---:|
| Java de producción (`java-service/src/main/java`) | 2 583 | **50,79 %** |
| PHP de producción (`api/` y `server.php`) | 2 503 | 49,21 % |
| **Total contado** | **5 086** | **100 %** |

**Fórmula:** `2 583 / (2 583 + 2 503) × 100 = 50,79 %`.

El conteo incluye líneas de comentarios, excluye líneas en blanco, pruebas Java, dependencias y artefactos generados. Considera Java de producción, el código PHP de `api/` (sin almacenamiento/logs) y el router de desarrollo `server.php`; no representa el porcentaje de Java de todo el repositorio, que también contiene una interfaz React/TypeScript. En el gráfico de lenguajes de GitHub, Java representa aproximadamente el **18,4 % del repositorio** porque ese gráfico usa el tamaño del código clasificado por lenguaje, no la proporción Java/PHP del backend. Consulta `revision.md` para el análisis detallado y la distinción entre ambos indicadores.

## Módulos trasladados a Java

- **Autenticación y usuarios:** inicio/cierre de sesión, verificación de JWT, listado, creación y actualización de usuarios.
- **Empresas:** listado paginado y filtrado, consulta, alta, actualización y cambio de estado.
- **Choferes:** listado paginado y filtrado, alta y actualización.
- **Estadísticas:** panel, resumen de empresas y analítica.
- **Asignaciones:** consulta, alta, historial, retiro de asignación y validación de circulación.
- **Verificaciones:** validación por placa, DNI o permiso, registro del resultado, historial y estadísticas diarias del fiscalizador.
- **Vehículos:** listado con filtros, datos de asignación/imágenes y cambio de estado.
- **Reportes:** generación de archivos Excel existente.

Las rutas migradas conservan sus nombres y el sobre de respuesta JSON `{ "success": ..., "data": ..., "message": ... }`. El frontend las envía a `VITE_JAVA_API_URL`; no fue necesario reorganizar `src/`, `api/` ni `java-service/`.

## Cambios técnicos

- Spring Boot se conecta al esquema MySQL/MariaDB existente por JDBC; no se añadieron migraciones de base de datos.
- Java valida los tokens heredados y BCrypt existentes para permitir la continuidad de sesiones y contraseñas.
- Se conservaron autorizaciones por rol, registro de auditoría y límites de frecuencia de autenticación/verificaciones y rutas de estadísticas/asignaciones.
- Los filtros de empresas, choferes, vehículos y verificaciones conservan paginación y campos usados por la interfaz.
- Los endpoints PHP sustituidos se retiraron. Se conservaron las exportaciones PHP y los módulos aún no migrados.

## Módulos que permanecen en PHP

- Ciclo de vida de permisos (generación, consulta, verificación, exportación y operaciones relacionadas con QR).
- Creación/actualización de vehículos y carga de imágenes.
- Exportaciones de empresas, choferes y vehículos.
- Historial de acciones y utilidades/infraestructura que todavía usan esos endpoints.

Por ello la aplicación todavía necesita ejecutar **ambos servicios**: Spring Boot y PHP. Un hosting compartido que solo ejecute PHP no atenderá las rutas migradas a Java. Para cPanel se requiere además un servidor Java compatible (por ejemplo VPS/plataforma administrada), configurar `VITE_JAVA_API_URL` al compilar el frontend y permitir el origen web en `CORS_ALLOWED_ORIGINS`.

## Archivos principales

- `java-service/src/main/java/pe/marcona/mtc/`: controladores y lógica Java de los módulos trasladados.
- `java-service/src/test/java/pe/marcona/mtc/`: pruebas de contratos HTTP y comportamientos.
- `src/lib/api-client.ts`: selección del servicio Java o PHP por operación.
- `api/index.php`: conserva las rutas PHP activas y deja de registrar estadísticas/asignaciones ya migradas.
- `java-service/src/main/resources/application.properties`: base de datos, URL pública de imágenes y demás configuración.
- `README.md`, `DEVELOPMENT.md`, `CPANEL_DEPLOYMENT.md` y documentos del servicio: alcance y ejecución actualizados.

## Configuración local

Configura las variables de entorno fuera del código fuente; no agregues credenciales reales al repositorio:

```env
VITE_API_URL=http://localhost:8000/api
VITE_JAVA_API_URL=http://localhost:8081/api
DB_HOST=localhost
DB_PORT=3306
DB_USER=usuario_local
DB_PASS=contraseña_local
DB_NAME=marcona_permisos
JWT_SECRET=secreto_largo_local
API_URL=http://localhost:8000/api
```

1. Inicializa una base de datos de desarrollo con `scripts/setup.sql`.
2. Inicia el backend PHP para las rutas que siguen allí.
3. Inicia el servicio Java desde `java-service` con `mvn spring-boot:run`.
4. Inicia la interfaz con `npm run dev`.
5. Verifica que Java responda en `http://localhost:8081/api/health`.

Java y PHP deben compartir `JWT_SECRET` mientras se utilicen endpoints protegidos en ambos servicios. En producción usa un secreto propio y configura los orígenes CORS reales.

## Verificación realizada

- `mvn -q -f .\java-service\pom.xml clean test`: **26 pruebas, 0 fallidas, 0 errores, 0 omitidas**.
- `npm run build`: **correcto**.
- No se ejecutó integración contra MySQL: no había archivo `.env` ni credenciales locales disponibles. Antes de desplegar, ejecuta los flujos migrados con una copia de prueba de la base existente.
- PHP CLI no está disponible en esta máquina, por lo que no se pudo correr `php -l` sobre `api/index.php`.

Las pruebas comprueban compilación Java y contratos/controladores simulados; no sustituyen la prueba de conexión a la base real ni la validación de las reglas SQL en producción.

## Guion para exposición

> “El objetivo se definió sobre el backend, no sobre todo el repositorio. Migré a Spring Boot autenticación, usuarios, empresas, choferes, estadísticas, asignaciones, verificaciones y la consulta y cambio de estado de vehículos. Se conservaron las rutas y el formato de respuesta que usa React, y se mantuvo la conexión al esquema MySQL existente. Con el conteo de líneas de producción del backend, Java representa 51,58 %: 2 583 líneas Java frente a 2 425 PHP. Se ejecutaron 26 pruebas Java y el build web terminó correctamente. PHP permanece para permisos, exportaciones y operaciones de vehículo todavía no migradas; para desplegar se deben ejecutar ambos servicios y completar pruebas de integración contra una base de datos de prueba.”
