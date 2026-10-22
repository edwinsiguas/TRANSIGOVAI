<?php

class RateLimiter
{

    public static function check(
        PDO    $pdo,
        string $action,
        int    $maxRequests  = 60,
        int    $windowSeconds = 60
    ): void {
        $ip = self::getClientIp();

        $stmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM rate_limits
            WHERE ip     = ?
              AND action = ?
              AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
        ");
        $stmt->execute([$ip, $action, $windowSeconds]);
        $count = (int) $stmt->fetchColumn();

        if ($count >= $maxRequests) {

            $retryStmt = $pdo->prepare("
                SELECT TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(MIN(created_at), INTERVAL ? SECOND))
                FROM rate_limits
                WHERE ip = ? AND action = ?
                  AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
            ");
            $retryStmt->execute([$windowSeconds, $ip, $action, $windowSeconds]);
            $retryAfter = max(1, (int) $retryStmt->fetchColumn());

            http_response_code(429);
            header('Retry-After: ' . $retryAfter);
            header('X-RateLimit-Limit: '     . $maxRequests);
            header('X-RateLimit-Remaining: 0');
            header('X-RateLimit-Reset: '     . (time() + $retryAfter));
            echo json_encode([
                'success' => false,
                'message' => 'Demasiadas solicitudes. Por favor espera ' . ceil($retryAfter / 60) . ' minuto(s) antes de intentar nuevamente.',
                'retry_after_seconds' => $retryAfter,
            ]);
            exit();
        }

        $insert = $pdo->prepare("
            INSERT INTO rate_limits (ip, action) VALUES (?, ?)
        ");
        $insert->execute([$ip, $action]);

        header('X-RateLimit-Limit: '     . $maxRequests);
        header('X-RateLimit-Remaining: ' . max(0, $maxRequests - $count - 1));
    }

    private static function getClientIp(): string
    {

        $trustedHeaders = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_REAL_IP',
            'HTTP_X_FORWARDED_FOR',
            'REMOTE_ADDR',
        ];

        foreach ($trustedHeaders as $header) {
            if (!empty($_SERVER[$header])) {

                $ip = trim(explode(',', $_SERVER[$header])[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }

        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
