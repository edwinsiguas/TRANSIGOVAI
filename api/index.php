<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/utils/auth-middleware.php';

spl_autoload_register(function ($class) {
    $classPath = str_replace('\\', '/', $class);
    $parts     = explode('/', $classPath);
    $parts[0]  = strtolower($parts[0]);
    $file      = __DIR__ . '/' . implode('/', $parts) . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

$pdo    = \Config\Database::getConnection();
$router = new \Core\Router();

require_once __DIR__ . '/utils/rate-limiter.php';
RateLimiter::check($pdo, 'api_general', maxRequests: 120, windowSeconds: 60);

$router->get('/permits',            ['Controllers\PermitController', 'list']);
$router->get('/permits/{id}',       ['Controllers\PermitController', 'get']);
$router->post('/permits',           ['Controllers\PermitController', 'generate']);
$router->put('/permits/{id}/revoke',['Controllers\PermitController', 'revoke']);
$router->post('/permits/{id}/renew',['Controllers\PermitController', 'renew']);
$router->post('/permits/verify',    ['Controllers\PermitController', 'verify']);
$router->post('/permits/expire',    ['Controllers\PermitController', 'markExpired']);
$router->get('/permits/vehicle-images/{id}', ['Controllers\PermitController', 'vehicleImages']);

$uri    = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

$router->dispatch($method, $uri);
