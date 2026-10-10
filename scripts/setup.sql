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
