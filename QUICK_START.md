# Quick Start - Inicia en 5 Minutos

## Para Desarrollo Local

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Crear Archivo .env
```bash
echo "VITE_API_URL=http://localhost:8000/api" > .env
```

### 3. Iniciar Base de Datos (Opcional)
```bash
# Si tienes MySQL instalado
mysql -u root -p < scripts/setup.sql

# O abre phpMyAdmin y importa scripts/setup.sql
```

### 4. Iniciar Servidor PHP
En una terminal:
```bash
cd public_html
php -S localhost:8000
```

### 5. Iniciar Frontend
En otra terminal:
```bash
npm run dev
```

### 6. Abre el Navegador
```
http://localhost:3000
```

### 7. Crear el administrador local

`scripts/setup.sql` no incluye un usuario ni una contraseña predeterminados.
Sigue [WINDOWS_SETUP.md](WINDOWS_SETUP.md) para crear el administrador con una
contraseña elegida localmente.

✅ **¡Listo!**

---

## Para Producción (cPanel)

### 1. Compilar
```bash
npm run build
```

### 2. Subir a cPanel
1. Accede a cPanel File Manager
2. Sube contenido de `dist/` a `public_html/`
3. Sube carpeta `api/` a `public_html/api/`

### 3. Crear Base de Datos
1. En cPanel → phpMyAdmin
2. Crear BD: `marcona_permisos`
3. Importar: `scripts/setup.sql`

### 4. Configurar API
Edita `public_html/api/config.php`:
```php
define('DB_USER', 'tu_usuario');
define('DB_PASS', 'tu_contraseña');
```

### 5. Acceder
```
https://tudominio.com
```

✅ **¡Listo!**

---

## Estructura de Carpetas

```
proyecto/
├── src/              → Código React
├── public_html/      → Backend PHP (luego dist/ para frontend)
│   └── api/         → Endpoints PHP
├── scripts/         → SQL setup
├── package.json     → Dependencias
└── vite.config.ts   → Config Vite
```

---

## Comandos Útiles

```bash
npm run dev      # Inicia desarrollo (localhost:3000)
npm run build    # Compila para producción
npm run preview  # Vista previa de build
npm run lint     # Valida código
```

---

## Primeras Acciones en el Dashboard

### 1. Crear una Empresa
```
Dashboard → Empresas → Nueva Empresa
Nombre: Mi Empresa
RUC: 12345678901
Email: empresa@example.com
```

### 2. Crear un Usuario (Chofer)
```
Dashboard → Usuarios → Nuevo Usuario
Email: chofer@example.com
Rol: Chofer
```

### 3. Crear un Chofer
```
Dashboard → Choferes → Nuevo Chofer
DNI: 12345678
Empresa: Mi Empresa
```

### 4. Crear un Vehículo
```
Dashboard → Vehículos → Nuevo Vehículo
Placa: ABC-1234
Chofer: (seleccionar)
```

### 5. Generar Permiso
```
Dashboard → Permisos → Generar Permiso
Seleccionar: Chofer, Vehículo, Fecha
```

✅ **¡Sistema funcionando!**

---

## Troubleshooting Rápido

### Error: "Cannot connect to database"
- Verifica BD está creada
- Revisa credenciales en `api/config.php`
- Asegúrate MySQL está ejecutándose

### Error: "API not found"
- Verifica servidor PHP está corriendo en puerto 8000
- Comprueba VITE_API_URL en .env

### Error: "Token invalid"
- Limpia localStorage: F12 → Application → Clear Storage
- Intenta login de nuevo

### Puerto 3000 o 8000 ocupado
```bash
# Linux/Mac
lsof -i :3000          # Ver qué usa puerto 3000
kill -9 <PID>          # Matar proceso

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## Acceso

No se incluyen credenciales predeterminadas. Crea el administrador localmente
siguiendo [WINDOWS_SETUP.md](WINDOWS_SETUP.md).

---

## Próximos Pasos

1. ✅ Desarrollo: Ver `DEVELOPMENT.md`
2. ✅ Producción: Ver `CPANEL_DEPLOYMENT.md`
3. ✅ Detalles: Ver `README.md`

---

**¡Disfruta desarrollando! 🚀**
