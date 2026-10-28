# Arquitectura recomendada para TRANSIGOVAI

Este documento relaciona la arquitectura sugerida en la imagen con la estructura que actualmente tiene el proyecto. Se distingue entre lo que se observó en el código y lo que se recomienda como evolución, para no confundir recomendaciones con funcionalidades ya implementadas.

## Resumen

TRANSIGOVAI es una aplicación **full-stack** formada por una interfaz web React/TypeScript, un backend REST en Java con Spring Boot y una base de datos MySQL. La organización por vistas, controladores y servicios ya cubre parte de la arquitectura sugerida. La diferencia principal es que el acceso a datos se realiza con `JdbcTemplate` desde los servicios, en lugar de una capa DAO/repositorio independiente.

## Arquitectura sugerida

```text
Usuario
  │
  ▼
Frontend web
  ├── Vistas y rutas (React)
  ├── Componentes reutilizables
  └── Cliente HTTP (Axios)
          │ HTTP/REST
          ▼
Backend Spring Boot
  ├── Controladores REST
  ├── Servicios: lógica de negocio y autorización
  ├── DAO/Repositorio: acceso a datos (capa recomendada)
  └── DTO y manejo centralizado de errores
          │ JDBC
          ▼
       MySQL
```

La capa DAO/repositorio del diagrama es una recomendación para separar persistencia y lógica de negocio. No representa la organización actual del código.

## Correspondencia con la imagen

| Área | Estado observado en el proyecto | Recomendación |
|---|---|---|
| **Frontend — Vista (MVC)** | La interfaz es una SPA de React con rutas y páginas en `src/pages`, componentes en `src/components` y rutas protegidas en `src/App.tsx`. | Mantener las páginas como vistas, delegar elementos compartidos a componentes y conservar el acceso a API en `src/lib/api-client.ts`. No es un MVC servidor tradicional; es una interfaz React cliente. |
| **Backend — controladores y lógica de negocio** | Los controladores REST están en `java-service/src/main/java/pe/marcona/mtc/controller`; los servicios están en `.../service`. Por ejemplo, `PermitController` delega operaciones a `PermitService` y aplica comprobaciones de acceso. | Mantener los controladores enfocados en HTTP (entrada, respuesta y estado) y concentrar las reglas de negocio en servicios. |
| **Persistencia — DAO** | Se usa `JdbcTemplate` con SQL en servicios como `PermitService`, `AuthService` y `AssignmentService`. No se encontró un paquete DAO/repositorio separado. | Incorporar una capa DAO/repositorio si se busca aislar consultas SQL y facilitar pruebas unitarias de la lógica sin depender directamente de JDBC. Mantener el esquema de base de datos existente. |
| **Calidad — TDD** | Hay pruebas automatizadas para controladores y servicios bajo `java-service/src/test`. La existencia de pruebas no permite confirmar que el proceso de desarrollo sea TDD (escribir primero la prueba). | Aplicar el ciclo Red-Green-Refactor a nuevas reglas de negocio y regresiones; conservar pruebas unitarias y añadir pruebas de integración para flujos críticos. |
| **Diseño — SOLID** | El código separa controladores y servicios, usa inyección por constructor en servicios y divide operaciones de consulta y mutación en módulos de vehículos. | Aplicar SOLID como criterio de revisión y refactorización; verificar responsabilidades y dependencias en cada cambio en vez de asumir conformidad total por la estructura de paquetes. |
| **Seguridad — validaciones y autenticación** | Hay autenticación y control de roles en servicios, contraseñas con BCrypt, limitación de solicitudes, validaciones de entrada y manejo global de errores. El cliente conserva el token en `localStorage`; la API también lo envía en encabezados. | Mantener la autorización en el backend como control definitivo; validar datos tanto en el cliente (experiencia de usuario) como en el servidor (seguridad e integridad). Gestionar secretos y credenciales mediante variables de entorno o un gestor de secretos, no con valores de desarrollo en configuración versionada. |

## Capas y responsabilidades actuales

### Frontend

- **Entrada:** `index.html` carga `src/main.tsx`, que monta la aplicación React.
- **Vistas y navegación:** `src/pages` contiene pantallas como permisos, vehículos, empresas, conductores, asignaciones, usuarios, historial y fiscalización. `src/App.tsx` declara rutas y restricciones de acceso según rol.
- **Componentes:** `src/components` contiene elementos compartidos y componentes de interfaz.
- **Comunicación con backend:** `src/lib/api-client.ts` centraliza las solicitudes HTTP y la gestión del token.
- **Validación de formularios:** `src/lib/validation.ts` contiene validaciones de formato del lado del cliente; estas no sustituyen las validaciones del backend.

### Backend

- **Arranque:** `MtcJavaApplication` inicia la aplicación Spring Boot.
- **Controladores:** `controller` expone endpoints REST para autenticación, permisos, vehículos, asignaciones, usuarios, estadísticas, reportes y otras operaciones.
- **Servicios:** `service` implementa reglas de negocio y coordina operaciones como autenticación, auditoría, permisos y circulación.
- **Persistencia:** los servicios usan `JdbcTemplate` para ejecutar consultas MySQL. La separación DAO indicada en la imagen aún no está presente.
- **Contratos y errores:** `dto` define respuestas y solicitudes; `ApiExceptionHandler` centraliza parte del manejo de errores HTTP.
- **Configuración transversal:** `CorsConfiguration` configura CORS, publicación de archivos y límites de solicitudes multipart.
- **Pruebas:** `java-service/src/test` contiene pruebas de controladores y servicios.

### Datos

La configuración del backend apunta a MySQL y el esquema inicial se define en `scripts/setup.sql`. Entre las entidades/tablas principales están usuarios, empresas, conductores, vehículos, asignaciones, permisos, imágenes de vehículos, registros de auditoría, límites de solicitudes y verificaciones.

## Recomendaciones de implementación

1. **Conservar la separación existente entre vistas, controladores y servicios.** Evitar trasladar lógica de dominio a componentes React o controladores REST.
2. **Evaluar una capa DAO/repositorio.** Extraer consultas SQL de los servicios gradualmente, empezando por los dominios con mayor volumen de consultas. Mantener los contratos de API y el comportamiento actual.
3. **Probar reglas y permisos.** Asegurar pruebas para accesos por rol, validaciones, operaciones de permisos (emisión, renovación y revocación) y errores esperados.
4. **Validar en servidor.** Tratar toda entrada del cliente como no confiable, parametrizar las consultas SQL y validar autorización antes de mutar datos.
5. **Revisar configuración sensible antes de desplegar.** Los valores locales/de desarrollo de conexión y secretos no deben considerarse configuración segura de producción; proporcionar valores mediante configuración externa.
6. **Mantener responsabilidades pequeñas.** Separar consultas, reglas de negocio, transporte HTTP y presentación cuando una clase acumule más de una responsabilidad.

## Referencias del proyecto

- Frontend: `src/App.tsx`, `src/main.tsx`, `src/pages/`, `src/components/`, `src/lib/api-client.ts`.
- Backend: `java-service/src/main/java/pe/marcona/mtc/controller/`, `java-service/src/main/java/pe/marcona/mtc/service/`, `java-service/src/main/java/pe/marcona/mtc/dto/` y `java-service/src/main/java/pe/marcona/mtc/exception/`.
- Persistencia y configuración: `java-service/src/main/resources/application.properties`, `scripts/setup.sql` y `docker-compose.yml`.
- Pruebas: `java-service/src/test/`.
- Documentación del sistema: `DOCUMENTACION_SISTEMA.md`.
