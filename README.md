# TRANSIGOVAI — Sistema de Gestión y Fiscalización de Permisos de Transporte
### Municipalidad de Marcona / MTC

![Backend Java Spring Boot](https://img.shields.io/badge/Backend-Java%2021%20LTS%20%7C%20Spring%20Boot%203.5-orange)
![Frontend React](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript%20%7C%20TailwindCSS-blue)
![Database](https://img.shields.io/badge/Database-MySQL%208.0%20%7C%20phpMyAdmin-blueviolet)
![Architecture](https://img.shields.io/badge/Architecture-Clean%20Architecture%20%7C%20SOLID-success)
![Build](https://img.shields.io/badge/Tests-37%20Passing%20(BUILD%20SUCCESS)-brightgreen)

Plataforma integral para la emisión, renovación, revocación y fiscalización en vía pública de permisos de circulación de mototaxis y transporte urbano con generación nativa de códigos QR, validación documental (SOAT, RT, Licencias) y auditoría completa.

---

## 📚 Documentación del Proyecto

El repositorio cuenta con documentación completa y estructurada:

- 🚀 **[GUÍA DE EJECUCIÓN (LINUX Y WINDOWS)](./GUIA_EJECUCION.md):** Manual paso a paso para levantar Docker (MySQL + phpMyAdmin), Backend en Java y Frontend en React tanto en entornos Linux como en Windows.
- 📐 **[DOCUMENTACIÓN TÉCNICA Y ARQUITECTURA](./DOCUMENTACION_SISTEMA.md):** Especificación profunda de la Arquitectura Limpia, principios SOLID, distribución de paquetes, reglas de negocio, modelo relacional y suite de 37 pruebas unitarias.

---

## ⚡ Inicio Rápido (3 Pasos con Docker)

### 1. Iniciar Base de Datos y phpMyAdmin
```bash
docker compose up -d
```
*(Crea automáticamente la base de datos `marcona_permisos`, todas las tablas y el usuario administrador).*
- **phpMyAdmin disponible en:** [http://localhost:8080](http://localhost:8080)

### 2. Iniciar Backend (Java Spring Boot)
```bash
cd java-service
mvn spring-boot:run
```
- **API disponible en:** [http://localhost:8081/api](http://localhost:8081/api)
- **Health Check:** [http://localhost:8081/api/health](http://localhost:8081/api/health)

### 3. Iniciar Frontend (React + Vite)
```bash
npm install
npm run dev
```
- **Aplicación web disponible en:** [http://localhost:3000](http://localhost:3000)

---

## 🔑 Credenciales de Acceso

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin@marcona.pe` | `Admin123*` | Administrador General (`admin`) |

---

## 📁 Estructura del Repositorio

```
TRANSIGOVAI/
├── java-service/                # Backend 100% Java Spring Boot (Arquitectura Limpia)
│   ├── src/main/java/pe/marcona/mtc/
│   │   ├── config/              # CORS con CorsFilter global y límites de partes Tomcat
│   │   ├── controller/          # 12 Controladores REST
│   │   ├── service/             # 16 Servicios de Lógica de Dominio y Negocio
│   │   ├── dto/                 # DTOs y sobre canónico ApiResponse<T>
│   │   ├── exception/           # Manejo global de excepciones (@RestControllerAdvice)
│   │   └── MtcJavaApplication.java
│   ├── src/test/java/           # 37 Pruebas Automatizadas (Controladores y Servicios)
│   └── pom.xml                  # Dependencias Maven (Java 21, ZXing QR, Apache POI)
│
├── src/                         # Frontend React 19 + TypeScript + TailwindCSS
│   ├── pages/                   # Vistas principales (Dashboard, Vehículos, Permisos, etc.)
│   ├── components/              # Componentes UI reutilizables
│   └── lib/api-client.ts        # Cliente Axios unificado hacia el puerto 8081
│
├── scripts/                     # Scripts de Base de Datos
│   ├── setup.sql                # Definición de tablas y restricciones
│   └── init-admin.sql           # Inserción del usuario administrador inicial
│
├── docker-compose.yml           # Entorno automatizado MySQL 8 + phpMyAdmin
├── DOCUMENTACION_SISTEMA.md     # Documentación técnica completa
├── GUIA_EJECUCION.md            # Guía detallada de ejecución para Linux y Windows
└── README.md                    # Este archivo
```
