-- =========================================================================
-- MIGRACIÓN: Tabla rate_limits para control de velocidad de peticiones
-- Aplicar en: phpMyAdmin → Base de datos marcona_permisos → SQL
-- =========================================================================

-- Tabla principal de registro de peticiones
CREATE TABLE IF NOT EXISTS rate_limits (
    id         BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    ip         VARCHAR(45)      NOT NULL COMMENT 'IPv4 o IPv6 del cliente',
    action     VARCHAR(100)     NOT NULL COMMENT 'Identificador de la acción (login, permit_verify, etc.)',
    created_at TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_rate_ip_action_time (ip, action, created_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Registro de peticiones para rate limiting por IP y acción';

-- ─────────────────────────────────────────────────────────────────────────────
-- Limpieza automática: elimina registros vencidos cada hora.
-- Esto evita que la tabla crezca indefinidamente.
-- IMPORTANTE: Requiere que el Event Scheduler esté activo en MySQL.
-- ─────────────────────────────────────────────────────────────────────────────
-- Nota: La limpieza automática (EVENT) se deshabilitó porque XAMPP en
-- algunos entornos tiene problemas con las tablas de sistema (ERROR 1408).
-- En producción (cPanel/RDS), puedes implementar un CRON JOB o reactivar
-- el Event Scheduler.
-- ─────────────────────────────────────────────────────────────────────────────
