# ⚠️ Notas Importantes - LEER ANTES DE USAR

## 1. Seguridad en Producción

### ❌ ANTES DE IR A PRODUCCIÓN DEBES CAMBIAR:

1. **Contraseña del Admin**
   - Crea el administrador localmente con una contraseña segura.
   - No guardes la contraseña ni su hash en el repositorio.

2. **JWT_SECRET en api/config.php**
   ```php
   // CAMBIAR ESTA LÍNEA
   define('JWT_SECRET', 'tu_clave_secreta_super_segura_y_larga_2024');
   ```

3. **Credenciales de Base de Datos**
   ```php
   // NO USES ESTAS CREDENCIALES EN PRODUCCIÓN
   define('DB_USER', 'tu_usuario_real');
   define('DB_PASS', 'tu_password_real');
   ```

4. **Desabilitar Debug**
   ```php
   // Comenta o establece en false
   error_reporting(0);
   ini_set('display_errors', 0);
   ```

---

## 2. Base de Datos

### Primeros pasos
- El script `setup.sql` crea todo automáticamente
- No se crea una cuenta administradora predeterminada. Crea la cuenta localmente
  siguiendo `WINDOWS_SETUP.md`.
- Las tablas incluyen índices para optimización

### Refactor de modelo (obligatorio en instalaciones existentes)
- Ejecuta `scripts/migrations/002_refactor_business_model.sql` si tu base ya existía antes del refactor.
- Esta migración agrega `users.is_active`, vuelve opcionales relaciones de chofer/empresa y crea `vehicle_images`.
- También migra usuarios con rol `chofer` al rol `empresa` para simplificar el modelo.
- Sin esa migración, los endpoints nuevos pueden fallar con errores de columnas faltantes.

### Respaldos
- En cPanel: Home → Backup
- Respaldar tabla `marcona_permisos` regularmente
- Guardar en lugar seguro

---

## 3. Archivos Críticos

### Backend
```
api/config.php              ← Credenciales DB y JWT
api/auth/login.php          ← Login
api/permits/generate.php    ← Generación de QR
```

### Frontend
```
.env                        ← VITE_API_URL (importante)
src/lib/api-client.ts       ← Cliente HTTP
```

### BD
```
scripts/setup.sql           ← Schema de base de datos
```

---

## 4. Permisos de Archivos en cPanel

Los permisos deben ser:

```
public_html/
├── index.html              644 (lectura)
├── assets/                 755 (carpeta)
├── api/
│   ├── *.php              644 (lectura)
│   └── (carpetas)         755 (lectura+ejecución)
```

Si hay errores de permisos:
- En cPanel File Manager: Click derecho → Change Permissions
- Archivos: 644
- Carpetas: 755

---

## 5. CORS y API

### En Desarrollo
La API está accesible desde localhost:3000 a localhost:8000

### En Producción
- El frontend y API están en el mismo dominio
- No hay CORS issues
- Headers CORS se envían de todas formas (sin problema)

### Si hay problemas CORS
En `api/config.php`:
```php
header('Access-Control-Allow-Origin: https://tudominio.com');
```

---

## 6. QR Code Generation

El sistema usa la API libre de `qrserver.com` para generar QR:
- No requiere instalación de librerías
- Funciona en cualquier servidor
- Limitaciones: ~1000 QR/día (más que suficiente)

Si necesitas mayor volumen:
- Instala `phpqrcode` via Composer
- Modifica `api/utils/qr-generator.php`

---

## 7. Rendimiento y Optimización

### Base de Datos
- Las consultas usan LIMIT y OFFSET (paginación)
- Los índices están en campos de búsqueda frecuente
- Prepared statements previenen SQL injection

### Frontend
- Vite hace minificación automática
- Los assets se cachean
- El bundle es < 500KB comprimido

### En Producción
- Activar compresión GZIP en Apache (.htaccess)
- Usar HTTPS (SSL en cPanel)
- Configurar caché headers

---

## 8. Roles de Usuario

### Admin
- Acceso completo al sistema
- Crear/editar/eliminar todo
- Ver todo el historial

### Empresa
- Ver solo sus choferes y vehículos
- Ver solo sus permisos
- Ver su propio historial

### Chofer
- Ver solo su información
- Ver solo sus permisos
- Ver su propio historial

---

## 9. Validaciones Importantes

### DNI (Perú)
- Exacto 8 dígitos
- Sin letras
- Ejemplo: 12345678

### RUC (Perú)
- Exacto 11 dígitos
- Sin guiones ni puntos
- Ejemplo: 12345678901

### Email
- Formato estándar
- Único en el sistema
- Ejemplo: usuario@ejemplo.com

### Teléfono
- 7 a 15 dígitos
- Ejemplo: 51999999999

---

## 10. Backup y Recuperación

### Backup Diario Recomendado
```bash
# En cPanel o via SSH
mysqldump -u root -p marcona_permisos > backup-$(date +%Y%m%d).sql
```

### Restaurar
```bash
mysql -u root -p marcona_permisos < backup-20240101.sql
```

---

## 11. Actualizaciones

Si necesitas actualizar la aplicación:

1. **Frontend**
   - Modificar código en `src/`
   - Compilar: `npm run build`
   - Copiar `dist/` a cPanel

2. **Backend**
   - Modificar archivos en `api/`
   - Subir a cPanel (reemplazar archivos)
   - No se necesita reinicio

3. **Base de Datos**
   - Crear nuevo script en `scripts/migration-XX.sql`
   - Ejecutar en cPanel
   - Documentar cambios

---

## 12. Monitoreo

### Revisar Regularmente
- Logs de error: cPanel → Error Log
- Uso de espacio: cPanel → Disk Usage
- Base de datos: phpMyAdmin → verificar integridad
- Historial: Dashboard → Historial

---

## 13. Checklist Pre-Producción

- [ ] Cambiar contraseña admin
- [ ] Cambiar JWT_SECRET
- [ ] Cambiar credenciales BD
- [ ] Desabilitar debug mode
- [ ] Configurar SSL/HTTPS
- [ ] Configurar .htaccess
- [ ] Hacer backup de BD
- [ ] Probar login
- [ ] Probar crear empresa
- [ ] Probar generar permiso
- [ ] Probar verificar QR
- [ ] Revisar error logs

---

## 14. Soporte y Ayuda

### Documentación
- `README.md` - General
- `DEVELOPMENT.md` - Desarrollo local
- `CPANEL_DEPLOYMENT.md` - Despliegue
- `QUICK_START.md` - Inicio rápido

### Troubleshooting
- Revisa los logs de error en cPanel
- Verifica credenciales en config.php
- Limpia cache del navegador (F12)
- Intenta en modo incógnito

---

## 15. Licencia y Uso

Este sistema es para uso exclusivo de la Municipalidad de Marcona.

No está permitido:
- ❌ Redistribuir sin permiso
- ❌ Modificar sin documentación
- ❌ Usar en otro municipio sin adaptar
- ❌ Compartir credenciales

---

## ⚠️ Recuerda

1. **Seguridad primero** - Cambia todas las credenciales
2. **Backups regulares** - Protege tus datos
3. **SSL activado** - En producción siempre HTTPS
4. **Logs revisados** - Monitorea errores
5. **Documentación** - Mantén registros de cambios

---

**Última actualización:** 2024
**Versión:** 1.0.0
**Crítico para leer antes de producción ⚠️**
