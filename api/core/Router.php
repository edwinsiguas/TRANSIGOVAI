<?php
namespace Core;

class Router {
    private $routes = [];

    public function get($path, $action) {
        $this->routes['GET'][$path] = $action;
    }

    public function post($path, $action) {
        $this->routes['POST'][$path] = $action;
    }

    public function put($path, $action) {
        $this->routes['PUT'][$path] = $action;
    }

    public function delete($path, $action) {
        $this->routes['DELETE'][$path] = $action;
    }

    public function dispatch($method, $uri) {

        $uri = parse_url($uri, PHP_URL_PATH);

        $uri = preg_replace('/^\/api/', '', $uri);

        if (empty($uri) || $uri === '') {
            $uri = '/';
        }

        if (isset($this->routes[$method])) {
            foreach ($this->routes[$method] as $route => $action) {

                $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<\1>[a-zA-Z0-9_-]+)', $route);
                $pattern = "#^" . $pattern . "$#";

                if (preg_match($pattern, $uri, $matches)) {

                    $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                    $this->executeAction($action, $params);
                    return;
                }
            }
        }

        $this->sendNotFound();
    }

    private function executeAction($action, $params) {
        if (is_callable($action)) {
            call_user_func_array($action, array_values($params));
            return;
        }

        if (is_array($action)) {
            [$class, $method] = $action;
            if (class_exists($class)) {
                $controller = new $class();
                if (method_exists($controller, $method)) {
                    call_user_func_array([$controller, $method], array_values($params));
                    return;
                }
            }
        }

        $this->sendNotFound();
    }

    private function sendNotFound() {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Endpoint no encontrado']);
        exit;
    }
}
