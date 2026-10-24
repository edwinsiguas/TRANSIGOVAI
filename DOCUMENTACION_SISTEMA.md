# Documentación Técnica del Sistema — TRANSIGOVAI
### Plataforma Web Integral para la Gestión, Emisión y Fiscalización de Permisos de Transporte (MTC / Municipalidad de Marcona)

---

## 1. Resumen Ejecutivo y Propósito

**TRANSIGOVAI** es una solución informática de alta disponibilidad diseñada para la administración y fiscalización del transporte menor (mototaxis y transporte urbano) en la jurisdicción municipal. Permite la trazabilidad completa del ciclo de vida de los permisos de circulación, validación de documentación técnica en tiempo real (SOAT, Revisiones Técnicas, Licencias de Conducir), control de asignaciones flota-empresa-chofer, generación nativa de códigos QR y auditoría rigurosa de cada operación.

El backend ha sido **migrado al 100% en Java 21 LTS con Spring Boot 3.5**, eliminando dependencias de servidores PHP legados, mientras que el frontend opera de forma unificada sobre **React 19, TypeScript, Vite y TailwindCSS**.

---

## 2. Principios de Diseño y Arquitectura de Software

La solución sigue los lineamientos de **Arquitectura Limpia (Clean Architecture)** y los principios **SOLID**:

```
                               ┌────────────────────────────────┐
                               │       Frontend (React 19)      │
                               │  Vite + TailwindCSS + Axios    │
                               └───────────────┬────────────────┘
                                               │ HTTP / REST (Port 8081)
                                               ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND JAVA SPRING BOOT (Clean Architecture)                  │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ 1. Capa de Controladores (pe.marcona.mtc.controller)                           │   │
│   │    - Endpoints RESTful y alias compatibles con rutas históricas                │   │
│   │    - Serialización y sobres uniformes de respuesta (ApiResponse<T>)            │   │
│   └──────────────────────────────────────┬─────────────────────────────────────────┘   │
│                                          │                                             │
│   ┌──────────────────────────────────────▼─────────────────────────────────────────┐   │
│   │ 2. Capa de Servicios de Dominio (pe.marcona.mtc.service)                       │   │
│   │    - Lógica de negocio pura (PermitService, VehicleMutationService, etc.)      │   │
│   │    - Reglas de validación documental (SOAT, RT, Licencias)                     │   │
│   │    - Generación nativa de QR en memoria (ZXing)                                │   │
│   │    - Procesamiento y compresión de fotos (AWT / ImageIO)                       │   │
│   └──────────────────────────────────────┬─────────────────────────────────────────┘   │
│                                          │                                             │
│   ┌──────────────────────────────────────▼─────────────────────────────────────────┐   │
│   │ 3. Capa de Persistencia y Seguridad (pe.marcona.mtc.service & config)          │   │
│   │    - Spring Data JDBC / JdbcTemplate sobre MySQL 8                             │   │
│   │    - Spring Security, BCrypt (coste 12) y JWT                                  │   │
│   │    - Filtro CORS global y límite de partes Tomcat                              │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ JDBC (Port 3306)
                                           ▼
                               ┌────────────────────────────────┐
                               │   Base de Datos MySQL 8.0      │
                               │   Esquema: marcona_permisos    │
                               └────────────────────────────────┘
```

### Aplicación de Principios SOLID:
- **S (Single Responsibility Principle):** Cada servicio se enfoca exclusivamente en un agregado del dominio (`PermitService` para permisos, `VehicleMutationService` para altas de vehículos y fotos, `AuthService` para seguridad).
- **O (Open/Closed Principle):** Los controladores y servicios están preparados para extender funcionalidades (como nuevos tipos de vehículos o nuevos formatos de exportación) sin alterar el comportamiento existente.
- **L (Liskov Substitution Principle):** Cumplimiento estricto de contratos e interfaces en las implementaciones de Spring.
- **I (Interface Segregation Principle):** Separación limpia entre operaciones de solo lectura (`VehicleQueryController/Service`) y mutaciones transaccionales (`VehicleMutationController/Service`).
- **D (Dependency Injection):** Inversión de control implementada mediante inyección por constructores tipados (`final`), evitando acoplamientos rígidos y facilitando la cobertura de pruebas unitarias.

---

## 3. Distribución de Paquetes en `java-service`

Toda la base de código Java se encuentra organizada bajo el paquete raíz `pe.marcona.mtc`:

```
pe.marcona.mtc/
├── config/
│   └── CorsConfiguration.java          # Configuración de CORS con CorsFilter global y TomcatConnectorCustomizer
│
├── controller/                         # Controladores REST (Recepción de solicitudes HTTP)
│   ├── ActionLogController.java        # Consulta de auditoría (/api/logs/list.php)
│   ├── AssignmentController.java       # Asignaciones flota-empresa-chofer (/api/assignments)
│   ├── AuthController.java             # Login, logout y validación de tokens (/api/auth)
│   ├── CompanyDriverController.java    # CRUD de empresas y conductores (/api/companies, /api/drivers)
│   ├── ExportController.java           # Descarga de datos tabulares (/api/*/export.php)
│   ├── PermitController.java           # Emisión, renovación, revocación y QR de permisos (/api/permits)
│   ├── ReportController.java           # Descarga de reportes binarios en Excel con Apache POI (/api/reports)
│   ├── StatisticsController.java       # Métricas de dashboard y analítica (/api/stats)
│   ├── UsersController.java            # Administración de cuentas y roles (/api/users)
│   ├── VehicleMutationController.java  # Creación, actualización y carga de fotos (/api/vehicles/create.php, etc.)
│   ├── VehicleQueryController.java     # Listados paginados y cambio de estado (/api/vehicles/list.php, etc.)
│   └── VerificationController.java     # Módulo de fiscalización en calle (/api/verifications)
│
├── service/                            # Lógica de Negocio y Reglas de Dominio
│   ├── ActionLogService.java           # Consultas sobre action_logs con joins a usuarios
│   ├── AssignmentService.java          # Reglas de asignación y desasignación de unidades
│   ├── AuditService.java               # Registro sincrónico y asincrónico de eventos de auditoría
│   ├── AuthService.java                # Autenticación, rate limiting y emisión de JWT
│   ├── CirculationService.java         # Validación de reglas de circulación vehicular
│   ├── CompanyDriverService.java       # Validaciones de RUC SUNAT y licencias MTC
│   ├── ExportService.java              # Preparación de datos para exportaciones tabulares
│   ├── LegacyTokenService.java         # Generación y validación de tokens JWT compatibles
│   ├── PermitService.java              # Generación correlativa anual (PERM-YYYY-NNNNN), renovaciones y revocación
│   ├── QrCodeService.java              # Motor nativo ZXing para generación de QR en Base64 PNG
│   ├── RateLimitService.java           # Control de frecuencia contra ataques de saturación en BD
│   ├── StatisticsService.java          # Consolidación de indicadores clave de gestión
│   ├── UserService.java                # ABM de usuarios con cifrado BCrypt
│   ├── VehicleMutationService.java     # Validación de placas, guardado y compresión de fotos (AWT/ImageIO)
│   ├── VehicleQueryService.java        # Búsqueda multicriterio de unidades
│   └── VerificationService.java        # Registro de actas de intervención en calle
│
├── dto/                                # Data Transfer Objects
│   ├── ApiResponse.java                # Envoltorio canónico: { "success": bool, "data": T, "message": str }
│   └── ReportRequest.java              # Estructura para peticiones de reportes tabulares
│
├── exception/                          # Manejo Global de Excepciones
│   ├── ApiException.java               # Excepción personalizada con HttpStatus y Retry-After
│   └── ApiExceptionHandler.java        # @RestControllerAdvice para respuestas de error uniformizadas
│
└── MtcJavaApplication.java             # Clase principal Spring Boot (@SpringBootApplication)
```

---

## 4. Módulos y Capacidades del Sistema

### 4.1. Autenticación y Control de Accesos
- **Roles del Sistema:**
  - `admin`: Acceso total (gestión de usuarios, permisos, reportes, auditoría y configuración).
  - `operador`: Registro de empresas, conductores, vehículos y emisión de permisos.
  - `fiscalizador`: Consulta rápida en calle y registro de intervenciones.
- **Seguridad:**
  - Contraseñas protegidas mediante **BCrypt con coste 12**.
  - Tokens **JWT** con firma HMAC-SHA256 y expiración configurable (`JWT_EXPIRY: 86400` seg).
  - **Rate Limiting** integrado en la tabla `rate_limits` para mitigar ataques de fuerza bruta en login e intervenciones masivas.

### 4.2. Flota Vehicular y Gestión Multimedia
- Validación de formato de placa vehicular peruana única.
- Almacenamiento seguro de fotos en el directorio local configurable (`uploads/vehicles/{id}`).
- **Compresión y redimensionamiento nativo (Java AWT / ImageIO):**
  - Cada imagen subida se procesa en memoria.
  - Si el ancho supera los 800 píxeles, se redimensiona proporcionalmente conservando la relación de aspecto.
  - Se comprime a formato JPEG al 75% de calidad para optimizar almacenamiento y velocidad de carga en dispositivos móviles de fiscalizadores.
  - Servido estático con cabeceras CORS en `/uploads/**`.
- Soporte para formularios complejos mediante conector Tomcat configurado con `max-part-count=200` y `max-parameter-count=10000`.

### 4.3. Ciclo de Vida de Permisos de Circulación
- **Correlativo Anual Automático:** Formato estandarizado `PERM-YYYY-NNNNN` (ejemplo: `PERM-2026-00001`), calculado directamente por año de emisión.
- **Validaciones Documentales Previas (Regla de Oro):**
  Para emitir o renovar un permiso, el sistema valida obligatoriamente:
  1. Que el vehículo esté en estado `activo`.
  2. Que cuente con póliza de **SOAT vigente** (fecha de vencimiento posterior a la fecha actual).
  3. Que cuente con certificado de **Revisión Técnica (RT) vigente**.
  4. Que el conductor asignado tenga su **Licencia de Conducir vigente**.
  5. Que exista una asignación activa entre la empresa y el vehículo.
- **Renovación:** Extiende la vigencia exactamente por +1 año desde la expiración previa.
- **Revocación:** Anulación del permiso con registro obligatorio del motivo y usuario responsable.

### 4.4. Generación y Validación de Código QR (ZXing)
- **Generación Offline en Memoria:** Utiliza la librería **ZXing (Zebra Crossing)** para renderizar códigos QR directamente en matrices de bytes Base64 (`data:image/png;base64,...`).
- **Independencia de Internet:** Elimina por completo las llamadas a APIs externas lentas o vulnerables a caídas.
- **Contenido del QR:** Encripta el identificador único del permiso, placa, empresa y URL pública de verificación ciudadana.

### 4.5. Módulo de Fiscalización en Calle (TUC Móvil)
- Optimizado para su uso en smartphones por inspectores municipales de tránsito.
- Consulta instantánea por **Placa**, **DNI del conductor** o **Número de Permiso**.
- Registro en tiempo real de intervenciones (`verifications`) con estado:
  - `autorizado`: Documentación y permiso 100% en regla.
  - `rechazado`: Detalle en JSON de las infracciones o documentos vencidos detectados.
- Contador de operativos e historial del fiscalizador por turno.

### 4.6. Reportes y Analítica
- Generación y descarga directa de hojas de cálculo binarias en formato Microsoft Excel (`.xlsx`) mediante **Apache POI**.
- Exportación tabular para: Empresas, Choferes, Flota Vehicular y Permisos Emitidos.
- Panel de control (Dashboard) con métricas de vehículos activos, permisos por vencer en los próximos 30 días y recaudación.

---

## 5. Modelo de Base de Datos (`marcona_permisos`)

La base de datos relacional MySQL 8.0 cuenta con las siguientes tablas optimizadas:

| Tabla | Propósito |
|---|---|
| `users` | Usuarios del sistema, roles (`admin`, `operador`, `fiscalizador`), estado y hash de contraseña |
| `companies` | Empresas de transporte, RUC (11 dígitos validado), representante y dirección |
| `drivers` | Conductores autorizados, DNI (8 dígitos), número y vencimiento de licencia |
| `vehicles` | Flota vehicular, placa, marca, modelo, motor, chasis, datos de SOAT y RT |
| `vehicle_images` | Rutas de fotografías asociadas a cada unidad y orden de visualización |
| `company_driver_assignments` | Historial y estado de asignaciones entre empresa, conductor y vehículo |
| `permits` | Permisos de circulación (TUC), correlativo anual, fechas de vigencia y QR Base64 |
| `verifications` | Registro de intervenciones en vía pública realizadas por los fiscalizadores |
| `action_logs` | Pistas de auditoría: usuario, acción, entidad afectada, IP y fecha/hora |
| `rate_limits` | Control de peticiones por IP y acción para mitigación de ataques |

---

## 6. Estrategia de Pruebas Automatizadas

El proyecto incluye una batería completa de 37 pruebas unitarias y de integración desarrolladas con **JUnit 5**, **Spring Boot Test**, **MockMvc**, **Mockito** y **AssertJ**:

```text
[INFO] Running pe.marcona.mtc.controller.ActionLogControllerTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.controller.AssignmentControllerTest
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.controller.AuthControllerTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.controller.CompanyDriverControllerTest
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.controller.ExportControllerTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.controller.PermitControllerTest
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.controller.ReportControllerTest
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.controller.StatisticsControllerTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.controller.UsersControllerTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.controller.VehicleMutationControllerTest
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.controller.VehicleQueryControllerTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.controller.VerificationControllerTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.service.AuthServiceTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.service.CirculationServiceTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.service.LegacyTokenServiceTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.service.QrCodeServiceTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] Running pe.marcona.mtc.service.UserServiceTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] Tests run: 37, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

Para ejecutar la suite completa de pruebas:
```bash
cd java-service
mvn test
```
