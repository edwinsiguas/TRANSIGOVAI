@echo off
cd /d "%~dp0"
echo Iniciando servicio Java MTC Marcona...
where java >nul 2>nul || (echo ERROR: Instala JDK 25 LTS y agregalo al PATH.& pause & exit /b 1)
where mvn >nul 2>nul || (echo ERROR: Instala Apache Maven 3.9 o superior y agregalo al PATH.& pause & exit /b 1)
mvn spring-boot:run
pause
