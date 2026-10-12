-- Usuario administrador inicial para pruebas locales
USE marcona_permisos;

-- Usuario: admin@marcona.pe
-- Password: Admin123*
INSERT INTO users (email, password, nombre, role, estado, is_active)
VALUES (
  'admin@marcona.pe',
  '$2a$12$CYrwjnLFl6rm09W8AhKG5.bmUeCUh44AVdmKiClapUD5pwJ1DKOai', 
  'Administrador General', 
  'admin', 
  'activo', 
  1
)
ON DUPLICATE KEY UPDATE 
  password = '$2a$12$CYrwjnLFl6rm09W8AhKG5.bmUeCUh44AVdmKiClapUD5pwJ1DKOai',
  estado = 'activo', 
  is_active = 1;
