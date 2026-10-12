-- ============================================================
-- Migración: Sistema de Roles + Módulo Fiscalizador
-- Ejecutar en phpMyAdmin o cPanel MySQL
-- ============================================================

USE marcona_permisos;

-- 1. Ampliar el ENUM de roles
ALTER TABLE users 
MODIFY COLUMN role ENUM('admin', 'operador', 'fiscalizador') NOT NULL;

-- 2. Tabla de verificaciones del fiscalizador
CREATE TABLE IF NOT EXISTS verifications (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  search_type  ENUM('placa', 'dni', 'permiso') NOT NULL,
  search_query VARCHAR(50) NOT NULL,
  resultado    ENUM('autorizado', 'rechazado') NOT NULL,
  motivos      JSON NULL,
  vehicle_data JSON NULL,
  ip_address   VARCHAR(45) NOT NULL DEFAULT '0.0.0.0',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ver_user_created (user_id, created_at),
  INDEX idx_ver_resultado    (resultado),
  INDEX idx_ver_created      (created_at),
  INDEX idx_ver_search       (search_type, search_query)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
