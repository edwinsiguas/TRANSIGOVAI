<?php

require_once '../config.php';
require_once '../utils/validation.php';
require_once '../utils/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, null, 'Método no permitido', 405);
}

try {
    $user = authenticateRequest($pdo, ['admin', 'operador']);

    $vehicleId = $_POST['vehicle_id'] ?? null;
    if (!$vehicleId || !is_numeric($vehicleId)) {
        sendResponse(false, null, 'vehicle_id es obligatorio', 400);
    }

    $vehicleId = (int)$vehicleId;

    $stmt = $pdo->prepare('SELECT id, placa, estado FROM vehicles WHERE id = ?');
    $stmt->execute([$vehicleId]);
    $vehicle = $stmt->fetch();

    if (!$vehicle) {
        sendResponse(false, null, 'Vehículo no encontrado', 404);
    }

    if ($vehicle['estado'] !== 'activo') {
        sendResponse(false, null, 'Solo se pueden subir imágenes a vehículos activos', 400);
    }

    if (empty($_FILES['images'])) {
        sendResponse(false, null, 'Debe enviar al menos una imagen', 400);
    }

    $files = $_FILES['images'];
    $normalizedFiles = [];

    if (is_array($files['name'])) {
        for ($index = 0; $index < count($files['name']); $index++) {
            if ($files['error'][$index] !== UPLOAD_ERR_NO_FILE) {
                $normalizedFiles[] = [
                    'name' => $files['name'][$index],
                    'type' => $files['type'][$index],
                    'tmp_name' => $files['tmp_name'][$index],
                    'error' => $files['error'][$index],
                    'size' => $files['size'][$index],
                ];
            }
        }
    } else {
        $normalizedFiles[] = $files;
    }

    if (count($normalizedFiles) === 0) {
        sendResponse(false, null, 'Debe enviar al menos una imagen válida', 400);
    }

    if (count($normalizedFiles) > 4) {
        sendResponse(false, null, 'Solo se pueden subir hasta 4 imágenes por vehículo', 400);
    }

    $stmt = $pdo->prepare('SELECT COUNT(*) as total FROM vehicle_images WHERE vehicle_id = ?');
    $stmt->execute([$vehicleId]);
    $existingImages = (int)($stmt->fetch()['total'] ?? 0);

    if ($existingImages + count($normalizedFiles) > 4) {
        sendResponse(false, null, 'El vehículo ya alcanzó el máximo de 4 imágenes', 400);
    }

    $uploadsRoot = dirname(__DIR__) . '/uploads';
    if (!is_dir($uploadsRoot) && !mkdir($uploadsRoot, 0755, true) && !is_dir($uploadsRoot)) {
        sendResponse(false, null, 'No se pudo crear la carpeta raíz de imágenes: ' . $uploadsRoot, 500);
    }

    if (!is_writable($uploadsRoot)) {
        sendResponse(false, null, 'La carpeta de imágenes no tiene permisos de escritura: ' . $uploadsRoot, 500);
    }

    $baseUploadDir = $uploadsRoot . '/vehicles/' . $vehicleId;
    if (!is_dir($baseUploadDir) && !mkdir($baseUploadDir, 0755, true) && !is_dir($baseUploadDir)) {
        sendResponse(false, null, 'No se pudo crear el directorio de imágenes del vehículo: ' . $baseUploadDir, 500);
    }

    $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : null;
    $storedImages = [];
    $sortOrder = $existingImages + 1;

    $pdo->beginTransaction();

    foreach ($normalizedFiles as $file) {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Error al subir archivo: ' . $file['name']);
        }

        $safeExtension = 'jpg';
        $uniqueName = sprintf(
            'vehicle_%d_%s_%s.%s',
            $vehicleId,
            date('YmdHis'),
            bin2hex(random_bytes(6)),
            $safeExtension
        );

        $destination = $baseUploadDir . '/' . $uniqueName;

        $maxWidth = 800;
        $quality = 75;

        $sourceType = mime_content_type($file['tmp_name']) ?: $file['type'];
        $image = null;

        switch ($sourceType) {
            case 'image/jpeg':
            case 'image/jpg':
                $image = @imagecreatefromjpeg($file['tmp_name']);
                break;
            case 'image/png':
                $image = @imagecreatefrompng($file['tmp_name']);
                if ($image) {

                    $bg = imagecreatetruecolor(imagesx($image), imagesy($image));
                    imagefill($bg, 0, 0, imagecolorallocate($bg, 255, 255, 255));
                    imagealphablending($bg, true);
                    imagecopy($bg, $image, 0, 0, 0, 0, imagesx($image), imagesy($image));
                    imagedestroy($image);
                    $image = $bg;
                }
                break;
            case 'image/webp':
                $image = @imagecreatefromwebp($file['tmp_name']);
                break;
        }

        if ($image) {
            $width = imagesx($image);
            $height = imagesy($image);

            if ($width > $maxWidth) {
                $newWidth = $maxWidth;
                $newHeight = (int)(($height / $width) * $newWidth);
                $resized = imagecreatetruecolor($newWidth, $newHeight);
                imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                imagedestroy($image);
                $image = $resized;
            }

            if (!imagejpeg($image, $destination, $quality)) {
                if (is_resource($image) || $image instanceof \GdImage) imagedestroy($image);
                throw new RuntimeException('No se pudo comprimir y guardar la imagen ' . $file['name']);
            }
            if (is_resource($image) || $image instanceof \GdImage) imagedestroy($image);
            $mimeType = 'image/jpeg';
        } else {

            if (!move_uploaded_file($file['tmp_name'], $destination)) {
                throw new RuntimeException('No se pudo guardar la imagen (fallback) ' . $file['name']);
            }
            $mimeType = $file['type'] ?: 'application/octet-stream';
            if ($finfo) {
                $detectedType = finfo_file($finfo, $destination);
                if ($detectedType) {
                    $mimeType = $detectedType;
                }
            }
        }

        $finalFileSize = filesize($destination);

        $relativePath = 'uploads/vehicles/' . $vehicleId . '/' . $uniqueName;

        $stmt = $pdo->prepare('
            INSERT INTO vehicle_images (vehicle_id, file_name, file_path, mime_type, file_size, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $vehicleId,
            $file['name'],
            $relativePath,
            $mimeType,
            $finalFileSize,
            $sortOrder,
        ]);

        $storedImages[] = [
            'file_name' => $file['name'],
            'file_path' => $relativePath,
            'mime_type' => $mimeType,
            'file_size' => $finalFileSize,
            'sort_order' => $sortOrder,
        ];

        $sortOrder++;
    }

    if ($finfo) {
        finfo_close($finfo);
    }

    $pdo->commit();

    logAction($pdo, $user['id'], 'subir_imagen_vehiculo', 'vehiculo', $vehicleId, 'Imágenes cargadas para vehículo ID ' . $vehicleId);

    sendResponse(true, [
        'vehicle_id' => $vehicleId,
        'images' => $storedImages,
    ], 'Imágenes subidas exitosamente', 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    sendExceptionResponse('Error al subir imágenes del vehículo', $e, 'Error al subir imágenes del vehículo');
}

?>
