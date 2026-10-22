# Guía de Desarrollo Local

## Sistema de Permisos de Mototaxis

Este documento describe cómo ejecutar la aplicación en tu computadora para desarrollo.

---

## 1. Requisitos Previos

- Node.js 16+ y npm
- JDK 25 y Maven 3.9+
- PHP 7.4+ (si ejecutas servidor PHP localmente)
- MySQL/MariaDB (opcional, puedes usar un servidor remoto)
- Git

---

## 2. Instalación

### A. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd marcona-mototaxi
```

### B. Instalar dependencias

```bash
npm install
```

### C. Crear archivo .env

```bash
cp .env.example .env
```

Edita `.env` con:
```
VITE_API_URL=http://localhost:8000/api
VITE_JAVA_API_URL=http://localhost:8081/api

# Configuración compartida por PHP y Java
APP_ENV=development
APP_DEBUG=true
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=marcona_permisos
JWT_SECRET=dev_only_change_me
JWT_EXPIRY=86400
APP_URL=http://localhost:3000
API_URL=http://localhost:8000/api
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
```

---

## 3. Configurar Backend PHP

### A. Crear base de datos local

Si tienes MySQL instalado:

```bash
# Crear base de datos
mysql -u root -p < scripts/setup.sql
```

O en phpMyAdmin:
1. Crear BD: `marcona_permisos`
2. Importar: `scripts/setup.sql`

### B. Ejecutar servidor PHP

```bash
# Opción 1: Usar servidor PHP integrado
cd public_html
php -S localhost:8000

# Opción 2: Usar XAMPP/WAMP
# Coloca la carpeta en htdocs y accede a http://localhost/marcona-mototaxi
```

### C. Configurar credenciales backend por variables de entorno

No edites `api/config.php` para secretos o credenciales.

Configura en `.env`:
- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`
- `JWT_SECRET`, `APP_DEBUG`, `APP_ENV`. Java y PHP deben usar el mismo `JWT_SECRET` para validar las mismas sesiones.
- `CORS_ALLOWED_ORIGINS` (orígenes permitidos separados por coma)

## 4. Configurar y ejecutar el backend Java

Inicia Spring Boot desde `java-service`:

```bash
mvn spring-boot:run
```

Java necesita acceso a la misma base de datos MySQL/MariaDB. Lee `.env` desde la raíz del proyecto o `api/.env`, además de las variables del sistema. Comprueba `http://localhost:8081/api/health`.

Java atiende autenticación, usuarios, empresas, choferes, estadísticas, asignaciones, verificaciones, consulta de vehículos y cambio de estado. El frontend usa `VITE_JAVA_API_URL` para esas operaciones. PHP continúa atendiendo permisos, exportaciones y operaciones de vehículos aún no migradas, usando `VITE_API_URL`.

---

## 5. Ejecutar la aplicación

### Terminal 1: Servidor Frontend (Vite)

```bash
npm run dev
```

Abre: http://localhost:3000

### Terminal 2: Servidor PHP (permisos, exportaciones y vehículos aún no migrados)

```bash
cd public_html
php -S localhost:8000
```

### Terminal 3: Servicio Java (operaciones migradas)

Desde `java-service`, ejecuta `mvn spring-boot:run`.

---

## 6. Crear el primer administrador

El script de base de datos no crea credenciales predeterminadas. Sigue
[WINDOWS_SETUP.md](WINDOWS_SETUP.md) para generar un hash local e insertar el
primer administrador. No guardes contraseñas ni hashes reales en el repositorio.

---

## 7. Estructura del Proyecto

```
/
├── src/
│   ├── pages/          # Páginas React
│   ├── components/     # Componentes reutilizables
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utilidades (API client, etc)
│   ├── types/          # Tipos TypeScript
│   ├── App.tsx         # Componente raíz
│   └── main.tsx        # Punto de entrada
├── public_html/        # Frontend estático (después de build)
│   └── api/            # Backend PHP
├── scripts/            # Scripts SQL y utilidades
├── vite.config.ts      # Configuración Vite
└── package.json        # Dependencias
```

---

## 8. Desarrollo

### Crear nuevo componente

```typescript
// src/components/MyComponent.tsx
import { Button } from '@/components/ui/button'

export function MyComponent() {
  return <div>Mi componente</div>
}
```

### Crear nueva página

```typescript
// src/pages/MyPage.tsx
export function MyPage() {
  return (
    <div>
      <h1>Mi página</h1>
    </div>
  )
}
```

Luego agregar ruta en `src/App.tsx`:

```typescript
<Route path="/mirruta" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
```

### Llamar a la API

```typescript
import { apiClient } from '@/lib/api-client'

const data = await apiClient.listCompanies({ page: 1 })
```

---

## 8. Build para Producción

```bash
npm run build
```

Esto genera la carpeta `dist/` con los archivos optimizados.

Para cPanel, además del frontend y la API PHP, despliega el servicio Java en un servidor o plataforma compatible y configura `VITE_JAVA_API_URL` al compilar. Un hosting PHP compartido por sí solo ya no cubre las rutas migradas. Consulta `CPANEL_DEPLOYMENT.md`.

---

## 9. Troubleshooting

### Error: "Cannot find module '@/components/ui/button'"

- Asegúrate que shadcn/ui esté instalado
- Verifica la ruta en tsconfig.json

### Error: "API connection refused"

- Verifica que el servicio que atiende la ruta está ejecutándose (Java para rutas migradas, PHP para las pendientes)
- Revisa `VITE_JAVA_API_URL` y `VITE_API_URL`
- Comprueba CORS en api/config.php

### Base de datos no conecta

- Verifica credenciales en api/config.php
- Revisa que MySQL está ejecutándose
- Comprueba que la BD fue creada

### Errores de tipado TypeScript

```bash
# Limpiar caché
rm -rf node_modules/.vite

# Reinstalar
npm install
```

---

## 10. Scripts Disponibles

```bash
npm run dev       # Inicia servidor de desarrollo
npm run build     # Build para producción
npm run preview   # Previsualizar build
npm run lint      # Validar código
```

---

## 11. Variables de Entorno

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000/api` | URL base del backend PHP aún activo |
| `VITE_JAVA_API_URL` | `http://localhost:8081/api` | URL base del backend Java |

---

## 12. Debugging

### Ver logs de la API

```bash
# En api/config.php, descomenta:
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

### Ver peticiones HTTP

En DevTools > Network, puedes ver todas las llamadas a la API.

### Usar console.log en React

```typescript
console.log("[v0] Debug info:", variable)
```

---

## 13. Recursos Útiles

- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [Vite Documentation](https://vitejs.dev)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [React Hook Form Documentation](https://react-hookform.com)

---

**Última actualización:** 2024
