<?php

const ROLE_ADMIN        = 'admin';
const ROLE_OPERADOR     = 'operador';
const ROLE_FISCALIZADOR = 'fiscalizador';

const ROLES_OPERATIVOS = [ROLE_ADMIN, ROLE_OPERADOR];

const ROLES_VERIFICACION = [ROLE_ADMIN, ROLE_OPERADOR, ROLE_FISCALIZADOR];

function authenticateRequest(PDO $pdo, array|string|null $requiredRole = null): array {
    $token = getAuthToken();

    if (!$token) {
        sendResponse(false, null, 'Token no proporcionado', 401);
    }

    $user = verifyToken($token);

    if (!$user) {
        sendResponse(false, null, 'Token inválido o expirado', 401);
    }

    $stmt = $pdo->prepare('SELECT id, email, nombre, role, estado, is_active FROM users WHERE id = ?');
    $stmt->execute([$user['user_id']]);
    $dbUser = $stmt->fetch();

    if (!$dbUser || $dbUser['estado'] === 'inactivo' || (int)$dbUser['is_active'] !== 1) {
        sendResponse(false, null, 'Usuario inválido o inactivo', 401);
    }

    if ($requiredRole) {
        $allowed = is_array($requiredRole) ? $requiredRole : [$requiredRole];
        if (!in_array($dbUser['role'], $allowed, true)) {
            sendResponse(false, null, 'No tiene permisos para esta acción', 403);
        }
    }

    return [
        'id'     => $dbUser['id'],
        'email'  => $dbUser['email'],
        'nombre' => $dbUser['nombre'],
        'role'   => $dbUser['role'],
        'user_id'=> $user['user_id']
    ];
}

function authenticateOptional(PDO $pdo): ?array {
    $token = getAuthToken();

    if (!$token) return null;

    $user = verifyToken($token);
    if (!$user) return null;

    $stmt = $pdo->prepare('SELECT id, email, nombre, role, estado, is_active FROM users WHERE id = ?');
    $stmt->execute([$user['user_id']]);
    $dbUser = $stmt->fetch();

    if (!$dbUser || $dbUser['estado'] === 'inactivo' || (int)$dbUser['is_active'] !== 1) {
        return null;
    }

    return [
        'id'     => $dbUser['id'],
        'email'  => $dbUser['email'],
        'nombre' => $dbUser['nombre'],
        'role'   => $dbUser['role']
    ];
}
