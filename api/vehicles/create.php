<?php

require_once '../config.php';
require_once '../utils/validation.php';
require_once '../utils/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, null, 'Método no permitido', 405);
}

try {
    $user = authenticateRequest($pdo, ['admin', 'operador']);
    $data = sanitize(getRequestData());

    $validator = new Validator();
    $dbValidator = new DatabaseValidator($pdo);

    $rules = [
        'placa'      => 'required|min:6|max:10',
        'categoria'  => 'required',
        'marca'      => 'required|min:2|max:50',
        'modelo'     => 'required|min:2|max:50',
        'color'      => 'required|min:3|max:30'
    ];

    if (!$validator->validate($data, $rules)) {
        sendResponse(false, null, 'Validación fallida: ' . $validator->getFirstError(), 400);
    }

    if (!empty($data['company_id']) && !is_numeric($data['company_id'])) {
        sendResponse(false, null, 'El campo company_id debe ser numérico', 400);
    }

    if (!$dbValidator->isUnique('vehicles', 'placa', $data['placa'])) {
        sendResponse(false, null, 'La placa ya está registrada', 400);
    }

    $pdo->beginTransaction();

    $stmt = $pdo->prepare('
        INSERT INTO vehicles (
            company_id, tipo_propiedad, tipo_servicio, categoria, placa, marca, modelo, color,
            ano_fabricacion, numero_vin, numero_motor, combustible,
            soat_poliza, soat_aseguradora, soat_vencimiento,
            rt_entidad, rt_certificado, rt_vencimiento, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');

    $stmt->execute([
        !empty($data['company_id']) ? (int)$data['company_id'] : null,
        in_array($data['tipo_propiedad'] ?? '', ['empresa','particular']) ? $data['tipo_propiedad'] : 'empresa',
        $data['tipo_servicio'] ?? null,
        $data['categoria'],
        strtoupper($data['placa']),
        $data['marca'],
        $data['modelo'],
        $data['color'],
        !empty($data['ano_fabricacion']) ? (int)$data['ano_fabricacion'] : null,
        $data['numero_vin'] ?? null,
        $data['numero_motor'] ?? null,
        $data['combustible'] ?? null,
        $data['soat_poliza'] ?? null,
        $data['soat_aseguradora'] ?? null,
        !empty($data['soat_vencimiento']) ? $data['soat_vencimiento'] : null,
        $data['rt_entidad'] ?? null,
        $data['rt_certificado'] ?? null,
        !empty($data['rt_vencimiento']) ? $data['rt_vencimiento'] : null,
        'activo'
    ]);

    $vehicleId = $pdo->lastInsertId();

    $storedImages = [];
    if (!empty($_FILES['images']) && $_FILES['images']['error'][0] !== UPLOAD_ERR_NO_FILE) {
        $files = $_FILES['images'];
        $uploadsRoot = dirname(__DIR__, 1) . '/uploads';
        $baseUploadDir = $uploadsRoot . '/vehicles/' . $vehicleId;

        if (!is_dir($uploadsRoot) && !mkdir($uploadsRoot, 0755, true)) {
            throw new RuntimeException('No se pudo crear carpeta uploads');
        }
        if (!is_dir($baseUploadDir) && !mkdir($baseUploadDir, 0755, true)) {
            throw new RuntimeException('No se pudo crear carpeta del vehículo');
        }

        $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : null;
        $sortOrder = 1;

        $count = is_array($files['name']) ? count($files['name']) : 1;
        for ($i = 0; $i < min($count, 4); $i++) {
            $err = is_array($files['error']) ? $files['error'][$i] : $files['error'];
            if ($err === UPLOAD_ERR_OK) {
                $tmpName = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
                $originalName = is_array($files['name']) ? $files['name'][$i] : $files['name'];
                $size = is_array($files['size']) ? $files['size'][$i] : $files['size'];
                $mimeType = is_array($files['type']) ? $files['type'][$i] : $files['type'];

                $extension = pathinfo($originalName, PATHINFO_EXTENSION);
                $safeExt = $extension ? strtolower($extension) : 'jpg';
                $allowed = ['jpg','jpeg','png','webp'];
                if (!in_array($safeExt, $allowed)) continue;

                $uniqueName = sprintf('vehicle_%d_%s_%d.%s', $vehicleId, uniqid(), $i, $safeExt);
                $destination = $baseUploadDir . '/' . $uniqueName;

                $maxWidth = 800;
                $quality = 75;
                $image = null;
                $sourceType = mime_content_type($tmpName) ?: $mimeType;

                switch ($sourceType) {
                    case 'image/jpeg':
                    case 'image/jpg':
                        $image = @imagecreatefromjpeg($tmpName);
                        break;
                    case 'image/png':
                        $image = @imagecreatefrompng($tmpName);
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
                        $image = @imagecreatefromwebp($tmpName);
                        break;
                }

                $compressed = false;
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

                    if (imagejpeg($image, $destination, $quality)) {
                        $compressed = true;
                        $mimeType = 'image/jpeg';
                        $size = filesize($destination);
                    }
                    if (is_resource($image) || $image instanceof \GdImage) imagedestroy($image);
                }

                if (!$compressed) {
                    if (!move_uploaded_file($tmpName, $destination)) {
                        continue;
                    }
                    if ($finfo) {
                        $detectedType = finfo_file($finfo, $destination);
                        if ($detectedType) $mimeType = $detectedType;
                    }
                    $size = filesize($destination);
                }

                $relPath = 'uploads/vehicles/' . $vehicleId . '/' . $uniqueName;

                $imgStmt = $pdo->prepare('INSERT INTO vehicle_images (vehicle_id, file_name, file_path, mime_type, file_size, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
                $imgStmt->execute([$vehicleId, $originalName, $relPath, $mimeType, $size, $sortOrder]);

                $storedImages[] = $relPath;
                $sortOrder++;
            }
        }
        if ($finfo) finfo_close($finfo);
    }

    logAction($pdo, $user['id'], 'crear', 'vehiculo', $vehicleId, 'Vehículo creado: ' . $data['placa']);
    $pdo->commit();

    sendResponse(true, ['id' => $vehicleId, 'placa' => $data['placa'], 'images' => $storedImages], 'Vehículo registrado exitosamente', 201);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Error al crear vehículo: ' . $e->getMessage());
    sendResponse(false, null, 'Error al procesar: ' . $e->getMessage(), 500);
}
?>
