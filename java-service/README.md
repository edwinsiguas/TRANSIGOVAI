# MTC Marcona — servicio Java

Servicio Spring Boot para autenticar y administrar usuarios, gestionar empresas/choferes, consultar estadísticas, administrar asignaciones, verificar circulación, consultar vehículos y crear reportes Excel a partir de datos JSON. Requiere Java 25, Maven 3.9+ y acceso a MySQL/MariaDB.

- `GET /api/health`: estado del servicio.
- `POST /api/reportes/excel`: recibe `{ "titulo": "...", "registros": [{...}] }` y devuelve un `.xlsx`.
- `/api/auth/*.php`: login, logout y verificación de tokens.
- `/api/users/*.php`: listar, crear y actualizar usuarios.
- `/api/companies/*.php`: listar, crear, obtener, actualizar y cambiar estado de empresas.
- `/api/drivers/*.php`: listar, crear y actualizar choferes.
- `/api/stats/*`, `/api/assignments/*`, `/api/verifications/*.php`: estadísticas, asignaciones, validación de circulación y registro de verificaciones.
- `/api/vehicles/list.php` y `/api/vehicles/toggle-status.php`: consulta y cambio de estado de vehículos.

Las rutas migradas conservan los contratos usados por la interfaz y el formato de los tokens de sesión existentes. El `JWT_SECRET` de Java debe coincidir con el de PHP mientras queden endpoints PHP protegidos.

PHP conserva permisos, exportaciones y la creación/actualización de vehículos e imágenes. No cambies el esquema de la base de datos. La medición actual supera el 50 % del backend por líneas fuente; no equivale al 50 % del repositorio completo. El detalle y el método de conteo están en `../javaagregados.md`.

Consulta `INSTRUCCIONES_WINDOWS.md` para configurar, ejecutar y probar el servicio. Corre en el puerto 8081 por defecto.
