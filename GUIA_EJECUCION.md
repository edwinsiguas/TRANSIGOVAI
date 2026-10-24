# Guía Rápida de Ejecución — TRANSIGOVAI
### Sistema Integral de Gestión y Fiscalización de Permisos de Transporte (MTC / Municipalidad de Marcona)

Esta guía te explica paso a paso cómo poner en marcha todo el sistema (**Base de Datos + phpMyAdmin con Docker**, **Backend en Java Spring Boot** y **Frontend en React**) tanto en **Linux** como en **Windows**.

---

## 📌 Arquitectura de Ejecución

El sistema funciona con 3 componentes desacoplados:
1. **Base de Datos & Gestor Web (Docker):**
   - **MySQL 8.0** en el puerto `3306` (Base de datos: `marcona_permisos`).
   - **phpMyAdmin** en el puerto `8080` (Interfaz web para ver y administrar tablas).
   - *Se autoinicializa con todas las tablas y el usuario administrador.*
2. **Backend (Java 21 LTS + Spring Boot 3.5):**
   - API RESTful en el puerto `8081` (`http://localhost:8081/api`).
3. **Frontend (React 19 + TypeScript + Vite + TailwindCSS):**
   - Aplicación web en el puerto `3000` (`http://localhost:3000`).

---

## 🐧 Guía para LINUX (Ubuntu / Debian / Mint)

### 1. Requisitos Previos
Verifica que tengas instaladas las herramientas principales:
```bash
docker --version
java -version    # Debe ser OpenJDK 21 o superior
mvn -version     # Apache Maven 3.9+
node -v          # Node.js 18 o superior
npm -v           # Gestor de paquetes de Node
```
*(Si no tienes docker-compose: `sudo apt install -y docker-compose-v2` y agrega tu usuario con `sudo usermod -aG docker $USER`).*

---

### 2. Paso a Paso de Ejecución en Linux

#### Paso A: Levantar la Base de Datos con Docker
Desde la raíz del proyecto (`TRANSIGOVAI`):
```bash
docker compose up -d
```
> *(Usa `sudo docker compose up -d` si tu usuario aún no reinició sesión tras añadirse al grupo docker).*
>
> **¿Qué hace automáticamente?**
> - Descarga e inicia MySQL 8 y phpMyAdmin.
> - Ejecuta `scripts/setup.sql` (crea todas las tablas).
> - Ejecuta `scripts/init-admin.sql` (crea el usuario `admin@marcona.pe` con su contraseña encriptada).
> - Puedes ingresar a **`http://localhost:8080`** y ver tus tablas en phpMyAdmin inmediatamente.

#### Paso B: Iniciar el Backend Java Spring Boot (Terminal 1)
Abre tu primera terminal y ejecuta:
```bash
cd java-service
mvn spring-boot:run
```
Verás el banner de Spring Boot y el mensaje final:
`Started MtcJavaApplication in X.XXX seconds (process running for X.XXX)`
- Comprueba que responde en: **`http://localhost:8081/api/health`**

#### Paso C: Iniciar el Frontend React (Terminal 2)
Abre una segunda terminal y ejecuta:
```bash
npm install
npm run dev
```
Te mostrará en verde:
`➜  Local:   http://localhost:3000/`

---

## 🪟 Guía para WINDOWS (Windows 10 / 11)

### 1. Requisitos Previos en Windows
1. **Docker Desktop para Windows:**
   - Descárgalo e instálalo desde [docker.com](https://www.docker.com/products/docker-desktop/).
   - Asegúrate de que Docker Desktop esté abierto y con el ícono en verde (Running).
2. **JDK 21 LTS (Java Development Kit):**
   - Recomendado: [Eclipse Temurin 21](https://adoptium.net/) u Oracle JDK 21+.
   - Asegúrate de marcar la casilla *"Set JAVA_HOME"* durante la instalación.
3. **Apache Maven:**
   - Descárgalo desde [maven.apache.org](https://maven.apache.org/download.cgi) y agrega su carpeta `bin` a las Variables de Entorno (PATH).
4. **Node.js (LTS):**
   - Descárgalo desde [nodejs.org](https://nodejs.org/) (incluye `npm`).

---

### 2. Paso a Paso de Ejecución en Windows (PowerShell o CMD)

#### Paso A: Levantar la Base de Datos con Docker Desktop
Abre PowerShell o CMD en la carpeta del proyecto y ejecuta:
```powershell
docker compose up -d
```
> Esto iniciará los contenedores de MySQL 8 y phpMyAdmin. Puedes verificarlo abriendo en tu navegador:
> 👉 **`http://localhost:8080`**

#### Paso B: Iniciar el Backend Java Spring Boot (Terminal 1)
En tu primera ventana de PowerShell o CMD:
```powershell
cd java-service
mvn spring-boot:run
```
Espera a que muestre:
`Started MtcJavaApplication in ... seconds`

#### Paso C: Iniciar el Frontend React (Terminal 2)
En una segunda ventana de PowerShell o CMD:
```powershell
npm install
npm run dev
```
Abre en tu navegador:
👉 **`http://localhost:3000`**

---

## 🔑 Credenciales de Acceso al Sistema

Una vez abierta la aplicación en `http://localhost:3000`, inicia sesión con:

| Campo | Valor |
|---|---|
| **Correo Electrónico** | `admin@marcona.pe` |
| **Contraseña** | `Admin123*` |
| **Rol asignado** | `admin` (Acceso completo a todos los módulos) |

---

## 🌐 Enlaces Rápidos del Entorno Local

| Servicio | URL Local | Descripción |
|---|---|---|
| **Frontend Web** | [http://localhost:3000](http://localhost:3000) | Aplicación React (MTC Marcona) |
| **phpMyAdmin** | [http://localhost:8080](http://localhost:8080) | Panel gráfico para explorar la Base de Datos MySQL |
| **API Backend** | [http://localhost:8081/api](http://localhost:8081/api) | Endpoint raíz de los servicios REST |
| **Health Check** | [http://localhost:8081/api/health](http://localhost:8081/api/health) | Diagnóstico de salud del servicio Java |

---

## 🛠️ Comandos Útiles de Docker

- **Ver el estado de los contenedores:**
  ```bash
  docker ps
  ```
- **Ver los logs de la base de datos MySQL:**
  ```bash
  docker logs transigovai-db
  ```
- **Detener los contenedores sin borrar los datos:**
  ```bash
  docker compose stop
  ```
- **Volver a encenderlos:**
  ```bash
  docker compose start
  ```
- **Apagar y eliminar contenedores (manteniendo los datos guardados):**
  ```bash
  docker compose down
  ```
- **Reiniciar la base de datos desde cero (borrar datos para re-ejecutar `setup.sql`):**
  ```bash
  docker compose down -v
  docker compose up -d
  ```

---

## ❓ Solución de Problemas Frecuentes

1. **Error: `Port 3306 is already in use`**
   - Tienes otro servicio de MySQL o XAMPP corriendo en tu máquina.
   - *Solución:* Detén el servicio local de MySQL (`sudo systemctl stop mysql` en Linux o detener MySQL en el panel de XAMPP) antes de ejecutar `docker compose up -d`.

2. **Error: `Port 8081 is already in use`**
   - Una instancia anterior de Java sigue en ejecución.
   - *Solución:* Presiona `Ctrl + C` en la terminal de Java o mata el proceso con `fuser -k 8081/tcp` (Linux) o `netstat -ano | findstr 8081` y `taskkill /PID <PID> /F` (Windows).

3. **Error en Windows: `execution of scripts is disabled on this system` en PowerShell**
   - *Solución:* Abre PowerShell como Administrador y ejecuta: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
