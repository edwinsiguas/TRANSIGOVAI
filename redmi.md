# Generación y descarga de reportes Excel con Java

## Introducción

Los botones **Descargar Reporte** de las páginas principales generan sus archivos Excel usando el mismo servicio Java:

- **La interfaz**, hecha con React y TypeScript, consulta los datos del reporte, aplica los filtros seleccionados y los prepara como registros.
- **El servicio Java**, construido con Spring Boot, recibe los registros, genera un archivo `.xlsx` y lo devuelve al navegador.

La interfaz no construye el Excel localmente. La creación del libro se centraliza en Java, mientras que cada página decide qué datos y columnas incluir.

## Páginas que generan reportes con Java

| Página | Datos incluidos en el reporte |
|---|---|
| Empresas | ID, razón social, RUC, representante legal, teléfono, email, dirección, estado, fecha de registro, vehículos, vencimientos documentales, conductores y permisos TUC. |
| Conductores | DNI, nombre, teléfono, número y vencimiento de licencia, vehículo asignado, empresa y estado. |
| Permisos | Número de permiso, placa, vehículo, conductor, empresa, fechas de emisión y vencimiento, y estado. |
| Vehículos | Placa, marca, modelo, año de fabricación, color, conductor asignado, empresa, fechas de vencimiento de SOAT y revisión técnica, y estado. |
| Historial | Indicadores, estado de documentación, crecimiento de flota, tipo de servicio y ranking de empresas. |

En Empresas, Conductores, Permisos y Vehículos se conservan las consultas de exportación existentes y sus filtros. La API de datos devuelve los registros; el servicio Java se ocupa de convertir el conjunto preparado en un archivo Excel.

## Proceso paso a paso

### 1. El usuario pulsa «Descargar Reporte»

En Empresas, Conductores, Permisos y Vehículos, el botón llama a la función `downloadExcel`. En Historial, el botón llama a `exportWithJava`. En todos los casos, se inicia la exportación del reporte correspondiente a la página.

### 2. La página obtiene y prepara los datos

Las páginas de Empresas, Conductores, Permisos y Vehículos solicitan los registros para exportar usando sus métodos existentes de `apiClient` y respetan los filtros actuales, como búsqueda, empresa o estado. Luego convierten cada objeto en un registro con nombres de columnas legibles.

Historial reúne los datos analíticos que ya tiene cargados: indicadores generales, estado documental, crecimiento de flota, tipos de servicio y ranking de empresas. En todos los casos, cada objeto de la lista de registros representa una fila potencial del archivo.

### 3. La interfaz envía los registros al servicio Java

Cada página llama a `downloadJavaExcelReport`, función compartida del cliente web. Esta función llama a `generateJavaExcelReport`, que envía una petición HTTP `POST` al endpoint:

```text
/api/reportes/excel
```

El cuerpo de la petición es JSON y contiene el título del reporte y los registros preparados por la página:

```json
{
  "titulo": "Reportes y estadísticas MTC Marcona",
  "registros": []
}
```

La dirección base se configura con `VITE_JAVA_API_URL`. Si no se define, se usa `http://localhost:8081/api`. Por tanto, para que la descarga funcione, el servicio Java debe estar ejecutándose en esa dirección o en la dirección configurada.

## Cómo ejecutar la funcionalidad en Windows

1. Inicia el backend PHP para las rutas que todavía sirven datos de exportación:

   ```powershell
   php -S localhost:8000 server.php
   ```

   Las exportaciones de Empresas, Conductores, Permisos y Vehículos consultan sus datos al endpoint PHP antes de enviarlos al generador Java. Por ello, esos reportes necesitan que PHP y la base MySQL estén disponibles.
2. Abre otra terminal en la carpeta `java-service` y ejecuta:

   ```powershell
   mvn spring-boot:run
   ```

   El servicio requiere JDK 25 LTS y Apache Maven 3.9 o superior.
3. Deja ambas terminales abiertas. Comprueba Java en `http://localhost:8081/api/health` y verifica también que PHP atienda `http://localhost:8000/api/`.
4. Abre otra terminal en la carpeta raíz del proyecto web y ejecuta:

   ```powershell
   npm run dev
   ```

4. Abre en el navegador la dirección local que muestre Vite y pulsa **Descargar Reporte** en la página deseada.

El servicio Java usa el puerto `8081` por defecto. Si se cambia la dirección o el puerto, configura `VITE_JAVA_API_URL` con la nueva URL base, por ejemplo `http://localhost:8081/api`, y reinicia el servidor web para que Vite cargue la variable.

## Cómo comprobar en la página que se usó Java

Pulsa **Descargar Reporte**. Verás el aviso **«Generando reporte con Java...»** y, si termina correctamente, **«Reporte Excel generado con Java y descargado correctamente»**. Esa confirmación aparece en las cinco páginas.

Para mostrarlo en una exposición, abre también las herramientas del navegador con `F12` → **Network/Red**, pulsa el botón y selecciona la solicitud `POST` a `/api/reportes/excel`. Esa solicitud llega al servicio Spring Boot y su respuesta es el archivo Excel.

## Guion sencillo para exponer

> «En esta página, al pulsar Descargar Reporte, los datos se envían al servicio Java. Java organiza la información y genera el archivo Excel. La página muestra que el reporte se generó con Java y luego lo descarga. Así, el mismo servicio se utiliza en las páginas de empresas, conductores, permisos, vehículos e historial.»

## Registro de modificaciones a la base de datos

Las operaciones de negocio migradas se procesan en Java; permisos, endpoints de datos de algunas exportaciones y operaciones pendientes de vehículos siguen en PHP. Ambos servicios registran las acciones auditadas en la tabla `action_logs` compartida. También escriben eventos JSONL en `api/storage/logs/database-audit.jsonl` cuando esa ruta está disponible en el servidor de cada proceso:

```text
api/storage/logs/database-audit.jsonl
```

Cada línea es un objeto JSON con fecha y hora, ID del usuario, acción, entidad, ID del registro, descripción resumida, IP, método HTTP y ruta del endpoint. No se guarda el cuerpo completo de la solicitud ni contraseñas. La carpeta `api/storage` tiene reglas de Apache para impedir que estos registros se descarguen desde el navegador; se pueden consultar directamente desde el sistema de archivos del servidor.

Para revisar eventos en una instalación local conjunta, abre `api/storage/logs/database-audit.jsonl`. Si Java y PHP se despliegan en servidores distintos, cada proceso escribe en su propio sistema de archivos; esos JSONL no se comparten automáticamente. La tabla MySQL `action_logs` es el registro común siempre que ambos servicios tengan acceso a la misma base. Si se necesita un JSONL único, configura `APP_AUDIT_FILE` con una ruta de almacenamiento compartida/montada y permisos de escritura para Java. `java-service/logs/mtc-java.log` es un registro técnico aparte (por ejemplo, generación de reportes y errores); no reemplaza la auditoría. Los contadores de límites y secuencias no se incluyen como cambios de negocio.

Este archivo registra cambios realizados mediante la aplicación y su API. Las ediciones manuales directas hechas en MySQL/phpMyAdmin no pasan por `logAction` y no quedan registradas en este archivo.

### 4. Spring Boot recibe la petición

En Java, el controlador `ReportController` atiende la ruta `/api/reportes/excel`. La anotación `@PostMapping` define el endpoint y `@RequestBody` indica que Spring debe convertir el JSON recibido en un objeto Java.

El objeto `ReportRequest` contiene dos campos:

- `titulo`: el título que se usará para el reporte y la hoja.
- `registros`: la lista de filas y sus datos.

### 5. Java valida la solicitud

Antes de crear el archivo, el controlador verifica que:

- La solicitud incluya registros y que la lista no esté vacía.
- No se supere el máximo de 10 000 registros.
- Ningún registro sea nulo.
- Existan columnas y no se excedan los límites de Excel.
- Los nombres de las columnas y los valores de las celdas no superen la longitud máxima permitida.

Si los datos no cumplen los requisitos, el servicio responde con un error HTTP y un mensaje que explica el problema.

### 6. Java determina las columnas

El controlador recorre los registros y recopila sus nombres de campo. Esos nombres se convierten en encabezados de columnas. Se conserva el orden en el que aparecen por primera vez.

Esto permite construir el reporte con columnas basadas en los campos enviados por la interfaz, sin tener que fijar de antemano una tabla específica para cada conjunto de datos.

### 7. Apache POI construye el libro Excel

El servicio usa la biblioteca **Apache POI** para crear el archivo `.xlsx`. En términos generales, realiza estas operaciones:

1. Crea un libro de Excel y una hoja.
2. Escribe el título del reporte.
3. Crea una fila para los encabezados y aplica formato en negrita y color de fondo.
4. Escribe cada registro en su propia fila.
5. Guarda los números como números, los valores `true`/`false` como booleanos y el resto como texto.
6. Ajusta automáticamente el ancho de las columnas.
7. Escribe el libro en memoria como una secuencia de bytes.

### 8. Java devuelve el archivo

El controlador responde con los bytes del archivo, el tipo MIME correspondiente a un libro Excel `.xlsx` y un nombre de archivo sugerido. El navegador recibe una respuesta binaria, no una página HTML ni un JSON.

### 9. El cliente y el navegador descargan el archivo

`generateJavaExcelReport` comprueba que la respuesta HTTP haya sido correcta y que el tipo de contenido corresponda a Excel. Después, convierte la respuesta en un `Blob`. La función compartida `downloadJavaExcelReport` crea una URL temporal y un enlace de descarga, activa la descarga desde el navegador, elimina el enlace y libera la URL temporal.

Los archivos usan nombres según la página, por ejemplo `Reporte_Empresas_Java_YYYY-MM-DD.xlsx`, `Reporte_Conductores_Java_YYYY-MM-DD.xlsx` o `Reporte_Estadisticas_Java_YYYY-MM-DD.xlsx`.

Durante el proceso, la página indica que se está generando el reporte y notifica al usuario si la descarga tuvo éxito o si ocurrió un error. Si Java no está disponible, el cliente informa que no se pudo conectar al servicio.

## Flujo resumido

```text
Usuario
  -> pulsa "Descargar Reporte"
  -> la página consulta los datos y prepara los registros
  -> java-report-client.ts envía la petición POST
  -> Spring Boot recibe el JSON
  -> ReportController valida los datos
  -> Apache POI crea el libro Excel
  -> Java devuelve el archivo .xlsx
  -> el navegador descarga el archivo
```

## Explicación breve para una presentación

> Cuando el usuario pulsa «Descargar Reporte», la página obtiene los registros correspondientes y los envía como JSON a un endpoint de Spring Boot. Java valida la solicitud, identifica las columnas y utiliza Apache POI para crear el archivo `.xlsx`. Finalmente, devuelve el archivo al navegador, que inicia la descarga. Este flujo se comparte entre Empresas, Conductores, Permisos, Vehículos e Historial.

## Observación sobre los períodos

La página muestra controles para elegir entre **últimos 30 días**, **Trimestral** y **Anual**. Sin embargo, en el código revisado, la selección se guarda en `dateRange`, pero no se utiliza para filtrar los datos que se envían al servicio. Por esa razón, esos botones no cambian por sí mismos el contenido del Excel exportado.

## Archivos relacionados

- `src/pages/Companies.tsx`: consulta los datos filtrados de empresas y prepara sus columnas.
- `src/pages/Drivers.tsx`: consulta los datos filtrados de conductores y prepara sus columnas.
- `src/pages/Permits.tsx`: consulta los datos filtrados de permisos y prepara sus columnas.
- `src/pages/Vehicles.tsx`: consulta los datos filtrados de vehículos y prepara sus columnas.
- `src/pages/Historial.tsx`: prepara los registros analíticos y muestra el botón «Descargar reporte».
- `src/lib/java-report-client.ts`: envía la petición HTTP, valida la respuesta y ofrece las funciones compartidas para generar y descargar el archivo.
- `java-service/src/main/java/pe/marcona/mtc/ReportController.java`: valida la solicitud y genera el archivo Excel.
- `java-service/src/main/java/pe/marcona/mtc/ReportRequest.java`: define la estructura de los datos que recibe Java.
- `java-service/src/test/java/pe/marcona/mtc/ReportControllerTest.java`: prueba la generación del Excel y algunas validaciones.
- `java-service/INSTRUCCIONES_WINDOWS.md`: contiene instrucciones complementarias para ejecutar y probar el servicio Java en Windows.
