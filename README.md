# Sistema de Permisos de Mototaxis

**Municipalidad de Marcona**

Sistema integral para gestionar permisos de mototaxis con generación de códigos QR, historial de acciones, y autenticación por roles.

---

## Características Principales

✅ **Autenticación de Usuarios**
- 3 roles: Admin, Empresa, Chofer
- Login seguro con JWT
- Gestión de sesiones

✅ **Gestión de Empresas**
- CRUD completo de empresas
- Validación de RUC
- Historial de cambios

✅ **Gestión de Choferes**
- Registro de choferes con DNI y licencia
- Validación de fecha de vencimiento
- Asociación con empresas

✅ **Gestión de Vehículos**
- Registro de vehículos con datos técnicos
- Asociación a choferes
- Placa única por vehículo

✅ **Generación de Permisos**
- Creación automática de número de permiso
- Generación de código QR
- Datos de permiso en QR
- Descarga PDF (en desarrollo)

✅ **Verificación de QR**
- Escaneo y verificación de permisos
- Validación de estado y vigencia
- Registro de verificaciones

✅ **Historial de Acciones**
- Registro de todas las operaciones
- Filtrado por fecha, usuario, acción
- Auditoría completa

---

## Tecnologías Utilizadas

### Frontend
- **React 19** - Framework UI
- **Vite** - Bundler rápido
- **TypeScript** - Tipado de código
- **React Hook Form** - Gestión de formularios
- **Zod** - Validación de esquemas
- **shadcn/ui** - Componentes UI
- **Tailwind CSS** - Estilos
- **Sonner** - Notificaciones
- **Axios** - Cliente HTTP

### Backend
- **Java 25 / Spring Boot** - Autenticación, usuarios, empresas, choferes, estadísticas, asignaciones, verificaciones, consulta/cambio de estado de vehículos y reportes Excel
- **PHP 7.4+** - Creación/actualización de vehículos e imágenes, permisos, exportaciones y endpoints todavía no migrados
- **MySQL/MariaDB** - Base de datos
- **PDO / JDBC** - Acceso a BD desde PHP y Java
- **JWT** - Sesiones compatibles entre ambos servicios

### Hosting
- **cPanel** - Plataforma de hosting
- **Apache** - Servidor web

---

## Estructura de Carpetas

```
/
├── src/                      # Frontend React
│   ├── pages/               # Páginas principales
│   ├── components/          # Componentes reutilizables
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilidades (API client)
│   ├── types/               # Tipos TypeScript
│   ├── App.tsx              # Componente raíz
│   ├── main.tsx             # Punto de entrada
│   └── index.css            # Estilos globales
│
├── scripts/                 # Scripts SQL
│   └── setup.sql            # Crear base de datos
├── java-service/            # API Java Spring Boot
├── api/                     # Endpoints PHP pendientes y utilidades compartidas
│   ├── permits/             # Operaciones de permisos
│   ├── vehicles/            # Alta/edición e imágenes de vehículos
│   ├── companies/           # Exportación de empresas
│   ├── drivers/             # Exportación de choferes
│   └── logs/                # Historial de acciones
│
├── vite.config.ts           # Configuración Vite
├── tsconfig.json            # Configuración TypeScript
├── package.json             # Dependencias
├── index.html               # HTML raíz
├── DEVELOPMENT.md           # Guía de desarrollo
├── CPANEL_DEPLOYMENT.md     # Guía de despliegue
└── README.md                # Este archivo
```

---

## Instalación Rápida

### Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo .env a partir del ejemplo
cp .env.example .env

# 3. Ejecutar base de datos (opcional)
mysql -u root -p < scripts/setup.sql

# 4. Iniciar servidor PHP desde la raíz (en otra terminal)
php -S localhost:8000 server.php

# 5. Iniciar backend Java desde java-service (en otra terminal)
cd java-service
mvn spring-boot:run

# 6. Iniciar frontend desde la raíz (en otra terminal)
cd ..
npm run dev
```

Accede a: http://localhost:3000

Para las operaciones migradas, inicia también `java-service` en el puerto 8081. Inicia PHP para permisos, exportaciones y operaciones de vehículos que aún no se migraron. Consulta [DEVELOPMENT.md](DEVELOPMENT.md).

**Acceso inicial:** el script de base de datos no crea una cuenta ni contraseña
predeterminadas. Sigue [WINDOWS_SETUP.md](WINDOWS_SETUP.md) para crear localmente
el administrador con una contraseña elegida por ti.

### Producción (cPanel)

Ver [CPANEL_DEPLOYMENT.md](CPANEL_DEPLOYMENT.md) para instrucciones completas.

---

## API Endpoints

### Autenticación
Estas rutas conservan sus nombres y son atendidas por Java usando `VITE_JAVA_API_URL`:
- `POST /api/auth/login.php` - Iniciar sesión
- `POST /api/auth/logout.php` - Cerrar sesión
- `POST /api/auth/verify-token.php` - Verificar token

### Usuarios
- `POST /api/users/create.php` - Crear usuario
- `GET /api/users/list.php` - Listar usuarios

### Empresas
- Java: crear, listar, obtener, actualizar y cambiar estado.
- `POST /api/companies/create.php` - Crear empresa
- `GET /api/companies/list.php` - Listar empresas
- `GET /api/companies/get.php?id=X` - Obtener empresa
- `PUT /api/companies/update.php` - Actualizar empresa

### Choferes
- Java: crear, listar y actualizar.
- `POST /api/drivers/create.php` - Crear chofer
- `GET /api/drivers/list.php` - Listar choferes

### Vehículos
- Java: `GET /api/vehicles/list.php` y `PUT /api/vehicles/toggle-status.php`.
- PHP: crear/actualizar vehículos y administrar sus imágenes.

### Permisos
- PHP mantiene el ciclo de vida de permisos y sus exportaciones.
- `POST /api/permits/generate.php` - Generar permiso
- `GET /api/permits/list.php` - Listar permisos
- `GET /api/permits/get.php?id=X` - Obtener permiso con QR
- `POST /api/permits/verify.php` - Verificar permiso

### Historial
- `GET /api/logs/list.php` - Listar historial

Los nombres de ruta de las operaciones Java se mantienen por compatibilidad. El frontend las envía a `VITE_JAVA_API_URL`; no se encuentran ya implementadas como archivos PHP.

Estadísticas, asignaciones y verificaciones también se atienden en Java. Para consultar el porcentaje medido y los módulos pendientes, revisa [javaagregados.md](javaagregados.md).

---

## Seguridad

✅ Hash de contraseñas con bcrypt  
✅ Autenticación JWT  
✅ Validación en frontend y backend  
✅ Prepared statements contra SQL injection  
✅ CORS configurado  
✅ Registro de todas las acciones  
✅ Control de permisos por rol  

---

## Validaciones

### Frontend
- Email válido
- DNI 8 dígitos
- RUC 11 dígitos
- Teléfono 7-15 dígitos
- Fechas futuras para licencias
- Campos requeridos

### Backend
- Validación de todos los inputs
- Unicidad de email, DNI, RUC, placa
- Existencia de relaciones (ForeignKey)
- Estados válidos
- Conversión de tipos de datos

---

## Flujos Principales

### 1. Login
```
Usuario → Formulario → Validación → API login → JWT → Redirect Dashboard
```

### 2. Generar Permiso
```
Admin → Formulario → Selecciona chofer/vehículo → Genera número → QR
```

### 3. Verificar QR
```
Código QR → Escanear → API verify → Valida vigencia → Muestra datos → Registra
```

### 4. Historial
```
Cualquier acción → Se registra → Log guardado → Filtrable en historial
```

---

## Componentes Principales

### Pages
- **Login** - Autenticación
- **Dashboard** - Panel principal
- **Companies** - Gestión de empresas
- **Permits** - Gestión de permisos
- **Historial** - Registro de acciones

### Hooks
- **useAuth** - Autenticación y usuario actual

### Utilidades
- **apiClient** - Cliente HTTP para API
- **Validator** - Validación de formularios
- **QRGenerator** - Generación de QR

---

## Próximas Características (Roadmap)

- [ ] Exportar historial a CSV/Excel
- [ ] Descargar permisos en PDF
- [ ] Notificaciones por email
- [ ] Dashboard de estadísticas
- [ ] Renovación automática de permisos
- [ ] Integración con cámara para escanear QR
- [ ] Soporte multiidioma

---

## Contribución

Para reportar bugs o sugerir features, crea un issue en el repositorio.

---

## Soporte

**Email:** soporte@marcona.gob.pe  
**Teléfono:** +51 XXX-XXXX  
**Documentación:** Ver DEVELOPMENT.md y CPANEL_DEPLOYMENT.md

---

## Licencia

Uso exclusivo para la Municipalidad de Marcona 2024

---

**Versión:** 1.0.0  
**Última actualización:** 2024  
**Estado:** Producción
