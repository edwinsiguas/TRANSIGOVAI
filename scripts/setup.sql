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

