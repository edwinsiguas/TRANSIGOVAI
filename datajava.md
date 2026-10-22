# Estado de migración Java

La información anterior de diagnóstico quedó reemplazada por la implementación de varios módulos del backend. El conteo actual y la explicación para exposición están en [javaagregados.md](./javaagregados.md).

**Resultado vigente:** Java representa **51,58 % del backend** por líneas de código productivo no vacías (2 583 Java frente a 2 425 PHP, contando `api/` y el router activo `server.php`). Este porcentaje no significa que la mitad de todo el repositorio sea Java; React/TypeScript permanece como frontend y varios módulos PHP siguen activos.

La migración conserva la estructura del proyecto y las rutas que consume la interfaz. Requiere ejecutar el servicio Spring Boot y el servidor PHP para los módulos aún no migrados. Las pruebas de Java y el build frontend pasan; falta validar las operaciones con una copia de MySQL antes de desplegar.
