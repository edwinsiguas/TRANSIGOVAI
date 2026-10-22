# Guía de Implementación en cPanel

## Sistema de Permisos de Mototaxis - Municipalidad de Marcona

Este documento describe el despliegue del frontend y los endpoints PHP que siguen activos. **El hosting PHP compartido de cPanel no ejecuta por sí solo el backend Java**, y las rutas migradas ya no tienen una implementación PHP de respaldo. Despliega `java-service` en un VPS, plataforma compatible con Java 25 o plan de cPanel que admita aplicaciones Java; la disponibilidad de Java depende del proveedor. Configura el frontend para conectarse al servicio.

---

## 1. Requisitos Previos

- Acceso a cPanel con capacidad de crear bases de datos MySQL
- PHP 7.4+ (generalmente disponible en cPanel)
- Node.js 16+ (para compilar el frontend)
- Un servidor o plataforma compatible con Java 25 y Maven 3.9+ para `java-service`
- Git (opcional, para clonar el repositorio)

---

## 2. Estructura de Carpetas en cPanel

```
public_html/
├── index.html
├── assets/
├── api/
│   ├── config.php
│   ├── vehicles/
│   ├── permits/
│   ├── logs/
│   └── utils/
└── .htaccess
```

El frontend y la API PHP pueden alojarse en cPanel; el servicio Java debe quedar accesible por HTTPS en un host compatible. La aplicación usa Java para autenticación, usuarios, empresas, choferes, estadísticas, asignaciones, verificaciones, consulta de vehículos y cambio de estado. PHP conserva permisos, endpoints de datos usados por algunas exportaciones y algunas operaciones de vehículos. Para que Java conecte a una base MySQL de cPanel desde otro proveedor, configura acceso remoto de MySQL y autoriza solo la IP del servidor Java; si el proveedor no permite conexiones remotas, aloja ambos backends en una red con acceso a la misma base. Los registros de auditoría en `action_logs` son comunes por la base compartida; el JSONL del sistema de archivos no se comparte entre servidores separados a menos que se configure almacenamiento montado con `APP_AUDIT_FILE`.

---

## 3. Paso 1: Crear Base de Datos en cPanel

### A través de phpMyAdmin:

1. Accede a cPanel → **phpMyAdmin**
2. Crear nueva base de datos: `marcona_permisos`
3. Crear un usuario MySQL con una contraseña fuerte y única (no reutilizar contraseñas de ejemplo):
   - Permisos: Todos los permisos
4. Ejecutar el script SQL:
   - En phpMyAdmin, ir a **Importar**
   - Cargar archivo `/scripts/setup.sql`
   - Ejecutar

---

## 4. Paso 2: Configurar Backend PHP

### A. Descargar y organizar archivos:

1. Descarga la carpeta `/api` completa a `public_html/api/`
2. Asegúrate que la estructura sea:
   ```
   public_html/api/
   ├── config.php
   ├── vehicles/
   ├── permits/
   ├── logs/
   └── utils/
   ```

### B. Configurar credenciales de forma segura:

Configura `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` y `JWT_SECRET` mediante el gestor de variables de entorno del hosting. No publiques credenciales ni las guardes en archivos PHP servidos desde `public_html`. PHP y Java deben usar la misma base de datos y el mismo `JWT_SECRET`.

Incluye también el archivo oculto `api/.htaccess` al subir `api/`: contiene la regla que envía las rutas PHP REST (por ejemplo, `/api/permits`) al router `api/index.php`. Java debe tener la URL pública de la API PHP en `API_URL` si necesita devolver enlaces de imágenes.

### C. Permisos de archivos:

En cPanel File Manager:
- Asegura que todos los archivos PHP sean legibles (644)
- Las carpetas tengan permisos 755

---

## 5. Paso 3: Compilar y Desplegar Frontend

### A. En tu computadora local:

```bash
# Instalar dependencias
npm install

# Crear archivo .env
echo "VITE_API_URL=https://tudominio.com/api" > .env
echo "VITE_JAVA_API_URL=https://api-java.tudominio.com/api" >> .env

# Compilar frontend
npm run build
```

### B. Subir a cPanel:

1. La carpeta `dist/` contiene los archivos compilados
2. Sube TODO el contenido de `dist/` a `public_html/`:
   - `index.html`
   - `assets/` (con todos los archivos)
3. El archivo `index.html` debe estar en la raíz de `public_html/`

---

## 6. Paso 4: Configurar .htaccess

Crea un archivo `.htaccess` en `public_html/` con el siguiente contenido:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # API requests - permite acceso directo a archivos PHP
  RewriteCond %{REQUEST_URI} ^/api/ [OR]
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  
  # Todas las demás rutas van a index.html (para React Router)
  RewriteRule ^ index.html [QSA,L]
</IfModule>

# Compresión GZIP (opcional)
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>
```

---

## 7. Paso 5: Configurar Variables de Entorno

Las llamadas PHP usan `VITE_API_URL`; las rutas migradas usan `VITE_JAVA_API_URL`.

### Compilar con las URLs correctas (obligatorio)

Las variables `VITE_*` se incrustan en el frontend durante la compilación; un `.env` dentro de `public_html/` no cambia el bundle ya generado. Antes de compilar, configura ambas URLs:
```bash
VITE_API_URL=https://tudominio.com/api VITE_JAVA_API_URL=https://api-java.tudominio.com/api npm run build
```

No publiques secretos en variables `VITE_*`: el navegador puede leerlas.

---

## 8. Verificar la Instalación

### A. Probar API:

```bash
curl -i https://api-java.tudominio.com/api/health
curl -i https://tudominio.com/api/permits
```

La ruta health debe indicar que Java está activo. La ruta PHP `/api/permits` sin token debe responder con un error de autenticación JSON (no una página 404/HTML); eso comprueba que el rewrite al router PHP funciona. Luego prueba inicio de sesión, consultas y cambios desde la interfaz con un usuario de prueba y datos no productivos.

### B. Acceder a la aplicación:

Abre en el navegador: `https://tudominio.com`

No dejes credenciales iniciales o contraseñas de ejemplo habilitadas en producción. Rota la clave inicial del administrador antes de abrir el sistema al público.

---

## 9. Cambiar Contraseña Admin

### A través de phpMyAdmin:

1. Abre phpMyAdmin
2. Ve a tabla `users`
3. Edita el usuario admin
4. Genera una nueva contraseña hash con:

```php
<?php
echo password_hash('TuNuevaContraseña2024', PASSWORD_BCRYPT, ['cost' => 12]);
?>
```

5. Copia el hash y actualiza el campo `password`

---

## 10. Seguridad en Producción

### Cambios recomendados:

1. **Cambiar credenciales de BD:** usa una contraseña fuerte, única y configurada fuera de los archivos públicos.

2. **Cambiar JWT_SECRET:** configura el mismo secreto aleatorio mediante variables de entorno en Java y PHP. No lo escribas en el código o en el frontend.

3. **Deshabilitar errores en pantalla:**
   ```php
   error_reporting(0); // En producción
   ini_set('display_errors', 0);
   ```

4. **Configurar HTTPS:**
   - En cPanel → AutoSSL
   - Fuerza HTTPS en .htaccess:
   ```apache
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   ```

5. **Backup regular:**
   - cPanel → Backup
   - Incluir base de datos `marcona_permisos`

---

## 11. Troubleshooting

### Error: "No se puede conectar a la base de datos"

- Verifica variables de entorno de Java y PHP
- Confirma permisos del usuario MySQL y, si Java está alojado aparte, que el proveedor permita MySQL remoto y haya autorizado la IP de Java
- Revisa que la BD fue creada con el script SQL

### Error: "Token inválido"

- Limpia localStorage en el navegador
- Intenta login nuevamente
- Verifica que `JWT_SECRET` sea consistente con PHP para las rutas que siguen activas
- Verifica que el servicio Java esté disponible y que `VITE_JAVA_API_URL` apunte a él

### Archivos PHP no se ejecutan

- Revisa permisos de archivos (644 para PHP)
- Confirma que cPanel tiene PHP habilitado
- Verifica la versión de PHP (debe ser 7.4+)

### API CORS errors

- Configura `CORS_ALLOWED_ORIGINS` en Java con el origen real de la aplicación
- Confirma que `VITE_JAVA_API_URL` y `VITE_API_URL` usan los hosts correctos
- Confirma que el proveedor Java permite solicitudes entrantes por HTTPS

---

## 12. Mantenimiento

### Cambiar base de datos:

En `api/config.php`, actualiza:
```php
define('DB_HOST', 'nuevo_host');
define('DB_USER', 'nuevo_usuario');
define('DB_PASS', 'nueva_contraseña');
define('DB_NAME', 'nueva_bd');
```

### Actualizar aplicación:

1. Compilar nuevo frontend: `npm run build`
2. Subir archivos de `dist/` a `public_html/`
3. Mantener `api/` para los endpoints PHP pendientes.
4. Desplegar y configurar por separado el servicio Java; no reemplazarlo sólo con una subida a `public_html/`.

---

## 13. Contacto y Soporte

Para reportar problemas, revisa los logs:
- cPanel → Error Log
- `/api/` - Error logs de PHP

---

**Versión:** 1.0
**Última actualización:** 2024
