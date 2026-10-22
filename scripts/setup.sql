-- ============================================================
-- PLATAFORMA WEB TUC - MUNICIPALIDAD PROVINCIAL DE ICA
-- Script de Base de Datos Optimizado (Versión 3.0 - Contexto Perú)
-- Base de datos: marcona_permisos
-- ============================================================

CREATE DATABASE IF NOT EXISTS marcona_permisos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE marcona_permisos;

-- ── 1. TABLA: users ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email       VARCHAR(100) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  nombre      VARCHAR(150) NOT NULL,
  role        ENUM('admin', 'operador', 'fiscalizador') NOT NULL DEFAULT 'operador',
  estado      ENUM('activo', 'inactivo', 'bloqueado') DEFAULT 'activo',
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. TABLA: companies ────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nombre      VARCHAR(150) UNIQUE NOT NULL,
  ruc         CHAR(11) UNIQUE NOT NULL CHECK (ruc REGEXP '^(10|15|17|20)[0-9]{9}$'), -- Valida RUC SUNAT
  telefono    CHAR(9) NOT NULL CHECK (telefono REGEXP '^[0-9]{9}$'),                 -- Solo 9 números
  email       VARCHAR(100) NOT NULL,
  direccion   VARCHAR(255) NOT NULL,
  contacto    VARCHAR(150) NOT NULL,
  estado      ENUM('activo', 'inactivo') DEFAULT 'activo',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_ruc (ruc),
  INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. TABLA: drivers ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id                         INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id                    INT UNSIGNED NULL UNIQUE,
  company_id                 INT UNSIGNED NULL,
  nombre_completo            VARCHAR(150) NOT NULL,
  dni                        CHAR(8) UNIQUE NOT NULL CHECK (dni REGEXP '^[0-9]{8}$'), -- Solo 8 números
  telefono                   CHAR(9) NOT NULL CHECK (telefono REGEXP '^[0-9]{9}$'),   -- Solo 9 números
  numero_licencia            VARCHAR(15) UNIQUE NOT NULL, 
  fecha_vencimiento_licencia DATE NOT NULL,
  estado                     ENUM('activo', 'inactivo', 'suspendido') DEFAULT 'activo',
  created_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  INDEX idx_dni (dni),
  INDEX idx_company_id (company_id),
  INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. TABLA: vehicles ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id                INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  driver_id         INT UNSIGNED NULL,
  company_id        INT UNSIGNED NULL,
  tipo_propiedad    ENUM('empresa', 'particular') NOT NULL DEFAULT 'empresa',
  tipo_servicio     ENUM('Moto-Taxi', 'Taxi', 'Colectivo', 'Carga', 'Especial') NULL,
  categoria         ENUM('L5', 'M1', 'N1', 'O1', 'OTRO') NOT NULL DEFAULT 'L5',
  placa             VARCHAR(7) UNIQUE NOT NULL CHECK (placa REGEXP '^[A-Z0-9-]{6,7}$'), -- Evita basura en la placa
  marca             VARCHAR(50) NOT NULL,
  modelo            VARCHAR(50) NOT NULL,
  color             VARCHAR(30) NOT NULL,
  ano_fabricacion   YEAR NULL,
  numero_vin        CHAR(17) UNIQUE NULL, 
  numero_motor      VARCHAR(20) NULL,
  combustible       ENUM('Gasolina', 'Gas', 'GLP', 'Diesel', 'Electrico', 'Hibrido', 'Otro') NULL,
  soat_poliza       VARCHAR(15) NULL, -- Reducido a 15 (Poliza SOAT = 12 dígitos)
  soat_aseguradora  VARCHAR(100) NULL,
  soat_vencimiento  DATE NULL,
  rt_entidad        VARCHAR(100) NULL,
  rt_certificado    VARCHAR(50) NULL,
  rt_vencimiento    DATE NULL,
  estado            ENUM('activo', 'inactivo') DEFAULT 'activo',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (driver_id)  REFERENCES drivers(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  INDEX idx_placa (placa),
  INDEX idx_driver_id (driver_id),
  INDEX idx_company_id (company_id),
  INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. TABLA: vehicle_assignments ─────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_assignments (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vehicle_id         INT UNSIGNED NOT NULL,
  driver_id          INT UNSIGNED NOT NULL,
  tipo               ENUM('propietario', 'alquiler', 'reemplazo_temporal') NOT NULL DEFAULT 'propietario',
  propietario_nombre VARCHAR(150) NULL,
  propietario_dni    CHAR(8) NULL CHECK (propietario_dni REGEXP '^[0-9]{8}$'),
  fecha_inicio       DATE NOT NULL,
  fecha_fin          DATE NULL,
  activo             TINYINT(1) NOT NULL DEFAULT 1,
  notas              TEXT NULL,
  created_by         INT UNSIGNED NULL,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id)  REFERENCES drivers(id)  ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE SET NULL,
  UNIQUE KEY uq_active_vehicle (vehicle_id, activo),
  INDEX idx_va_vehicle_active (vehicle_id, activo),
  INDEX idx_va_driver (driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. TABLA: permit_sequences ─────────────────────────────
CREATE TABLE IF NOT EXISTS permit_sequences (
  year        YEAR NOT NULL PRIMARY KEY,
  last_number INT UNSIGNED NOT NULL DEFAULT 0 -- INT UNSIGNED evita números negativos
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO permit_sequences (year, last_number)
VALUES (YEAR(CURDATE()), 0);

-- ── 7. TABLA: permits ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS permits (
  id                INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  assignment_id     INT UNSIGNED NULL,
  driver_id         INT UNSIGNED NULL,
  vehicle_id        INT UNSIGNED NOT NULL,
  company_id        INT UNSIGNED NULL,
  tipo_permiso      ENUM('libre_transito', 'ruta_fija', 'carga', 'especial') NOT NULL DEFAULT 'libre_transito',
  numero_permiso    VARCHAR(20) UNIQUE NOT NULL, 
  fecha_emision     DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  qr_code           LONGTEXT NOT NULL, 
  estado            ENUM('vigente', 'vencido', 'suspendido', 'revocado', 'renovado') DEFAULT 'vigente',
  numero_recibo     VARCHAR(50) NULL,
  monto_pagado      DECIMAL(10, 2) NULL,
  observaciones     TEXT NULL,
  created_by        INT UNSIGNED NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (assignment_id) REFERENCES vehicle_assignments(id) ON DELETE RESTRICT,
  FOREIGN KEY (driver_id)     REFERENCES drivers(id)             ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id)    REFERENCES vehicles(id)            ON DELETE CASCADE,
  FOREIGN KEY (company_id)    REFERENCES companies(id)           ON DELETE RESTRICT,
  FOREIGN KEY (created_by)    REFERENCES users(id)               ON DELETE RESTRICT,
  
  INDEX idx_numero_permiso (numero_permiso),
  INDEX idx_assignment_id (assignment_id),
  INDEX idx_driver_id (driver_id),
  INDEX idx_vehicle_id (vehicle_id),
  INDEX idx_company_id (company_id),
  INDEX idx_estado (estado),
  INDEX idx_fecha_vencimiento (fecha_vencimiento),
  INDEX idx_permits_estado_vence (estado, fecha_vencimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. TABLA: vehicle_images ───────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_images (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  vehicle_id  INT UNSIGNED NOT NULL,
  file_name   VARCHAR(255) NOT NULL,
  file_path   VARCHAR(500) NOT NULL,
  mime_type   VARCHAR(100) NOT NULL,
  file_size   INT UNSIGNED NOT NULL, -- Tamaño en bytes no puede ser negativo
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  UNIQUE KEY uq_vehicle_sort (vehicle_id, sort_order),
  INDEX idx_vehicle_id (vehicle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9. TABLA: action_logs ──────────────────────────────────
CREATE TABLE IF NOT EXISTS action_logs (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  accion      VARCHAR(50) NOT NULL,
  entidad     VARCHAR(50) NOT NULL,
  entidad_id  INT UNSIGNED NULL,
  descripcion TEXT NULL,
  ip_address  VARCHAR(45) NULL, 
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_accion (accion),
  INDEX idx_entidad (entidad),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 10. TABLA: rate_limits ─────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limits (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ip         VARCHAR(45) NOT NULL COMMENT 'IPv4 o IPv6 del cliente',
  action     VARCHAR(100) NOT NULL COMMENT 'Identificador de la accion',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_rate_ip_action_time (ip, action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 11. TABLA: verifications ───────────────────────────────
CREATE TABLE IF NOT EXISTS verifications (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  search_type  ENUM('placa', 'dni', 'permiso') NOT NULL,
  search_query VARCHAR(50) NOT NULL,
  resultado    ENUM('autorizado', 'rechazado') NOT NULL,
  motivos      JSON NULL,
  vehicle_data JSON NULL,
  ip_address   VARCHAR(45) NOT NULL DEFAULT '0.0.0.0',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ver_user_created (user_id, created_at),
  INDEX idx_ver_resultado (resultado),
  INDEX idx_ver_created (created_at),
  INDEX idx_ver_search (search_type, search_query)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 12. ÍNDICES COMPUESTOS ─────────────────────────────────
CREATE INDEX idx_users_email_role   ON users(email, role);
CREATE INDEX idx_permits_state_date ON permits(estado, fecha_vencimiento);
CREATE INDEX idx_drivers_company    ON drivers(company_id, estado);
CREATE INDEX idx_vehicles_company   ON vehicles(company_id, estado);
CREATE INDEX idx_logs_date_user     ON action_logs(created_at, user_id);

-- No se crea un administrador con contraseña predeterminada.
-- Crea el primer administrador localmente siguiendo WINDOWS_SETUP.md.
