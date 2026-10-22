# Instalación local en Windows

Esta rama está preparada para ejecutar Marcona Movilidad localmente con XAMPP.

## Requisitos

- Node.js 22 LTS
- XAMPP para Windows (Apache y MySQL)
- Git
- Visual Studio Code (opcional)

## Instalación inicial

1. Clona el repositorio y cambia a esta rama:

   ```powershell
   git clone https://github.com/Wilmer1404/MTC_MARCONA_COMPLETO.git
   cd MTC_MARCONA_COMPLETO
   git switch windows-version
   ```

2. Copia el backend a `C:\xampp\htdocs\api`.

3. Copia `api\.env.example` como `C:\xampp\htdocs\api\.env`.

4. En XAMPP, inicia Apache y MySQL.

5. Abre `http://localhost/phpmyadmin`, crea o selecciona la base
   `marcona_permisos` e importa `scripts\setup.sql`.

6. Verifica el usuario administrador:

   ```sql
   SELECT email, role, estado, is_active
   FROM users
   WHERE email = 'admin@marcona.pe';
   ```

   `scripts\setup.sql` no crea credenciales predeterminadas. Genera un hash local
   para la contraseña que elijas (no compartas la contraseña ni el hash):

   ```powershell
   # Desde la raíz del proyecto:
   php -r '$password = readline("Nueva contraseña de administrador: "); echo password_hash($password, PASSWORD_BCRYPT, ["cost" => 12]), PHP_EOL;'
   ```

   Copia el hash generado en el siguiente SQL y ejecútalo en phpMyAdmin. Sustituye
   `PEGA_AQUI_EL_HASH_LOCAL` por el hash; no pongas la contraseña en el SQL:

   ```sql
   INSERT INTO users (email, password, nombre, role, estado, is_active)
   VALUES ('admin@marcona.pe', 'PEGA_AQUI_EL_HASH_LOCAL', 'Administrador', 'admin', 'activo', 1);
   ```

   Si esa cuenta ya existe, actualiza su hash en vez de insertarla:

   ```sql
   UPDATE users
   SET password = 'PEGA_AQUI_EL_HASH_LOCAL', estado = 'activo', is_active = 1
   WHERE email = 'admin@marcona.pe';
   ```

7. En la raíz del proyecto, crea `.env` con:

   ```env
   VITE_API_URL=http://localhost/api
   VITE_JAVA_API_URL=http://localhost:8081/api
   VITE_APP_TITLE="Marcona Movilidad"
   ```

8. Instala y ejecuta el frontend:

   ```powershell
   npm install
   npm run dev
   ```

9. Abre `http://localhost:3000`.

## Inicio diario

1. Inicia Apache y MySQL en XAMPP.
2. Abre una terminal en la raíz del proyecto.
3. Ejecuta `npm run dev`.
4. Accede a `http://localhost:3000`.

## Generar un reporte con Java Spring Boot

1. Inicia Apache y MySQL desde XAMPP, como de costumbre.
2. En otra terminal, abre `java-service` y ejecuta `mvn spring-boot:run`.
3. Inicia el frontend con `npm run dev` y accede a `http://localhost:3000`.
4. Entra en **Reportes y Estadísticas** y pulsa **Generar Excel con Java Spring Boot**.
5. El navegador descargará un Excel con los indicadores, el estado de documentos,
   el crecimiento de la flota, los tipos de servicio y el ranking mostrados.

La petición aparece en las herramientas del navegador en **F12 → Network/Red →
Fetch/XHR** como `POST http://localhost:8081/api/reportes/excel`. La aplicación
envía a Java los datos que ya obtuvo de la API PHP; Spring Boot genera el archivo
Excel, pero no reemplaza ni consulta directamente la base de datos.

## Notas

- No subas `.env` ni `api\.env`; contienen configuración local.
- La rama `main` conserva la configuración de producción.
- Si Apache usa el puerto 8080, cambia las URLs de ambos archivos `.env`
  a `http://localhost:8080/api`.
