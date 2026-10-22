<?php
/**
 * server.php — Router para PHP Built-in Server
 * Uso: php -S localhost:8080 server.php
 *
 * Emula el .htaccess de Apache para que las rutas REST funcionen sin XAMPP.
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// 1. Raíz del servidor → dejar pasar
if ($uri === '/') {
    return false;
}

// 2. Si el archivo físico existe, PHP lo sirve directamente
//    (ej: exportaciones PHP, rutas pendientes de vehículos, etc.)
if (file_exists(__DIR__ . $uri) && is_file(__DIR__ . $uri)) {
    return false;
}

// 3. Rutas REST bajo /api/ que NO son archivos físicos
//    (ej: /api/permits)
if (strpos($uri, '/api/') === 0) {

    // Para cualquier petición OPTIONS (preflight CORS), responder rápido con los headers.
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token');
        header('Access-Control-Max-Age: 86400');
        http_response_code(204);
        exit;
    }

    // Redirigir al controlador frontal de la API
    chdir(__DIR__ . '/api');
    require __DIR__ . '/api/index.php';
    return true;
}

// 4. Cualquier otra ruta: dejar que PHP busque el archivo normalmente
return false;
