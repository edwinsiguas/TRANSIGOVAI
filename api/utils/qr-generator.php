<?php

class QRGenerator {
    public static function generateQRDataUrl($text, $size = 200, $level = 'M', $margin = 0) {

        $encodedText = urlencode($text);
        $url = "https://api.qrserver.com/v1/create-qr-code/?size={$size}x{$size}&data={$encodedText}&ecc={$level}&margin={$margin}";

        $imageData = @file_get_contents($url);

        if ($imageData === false) {

            return null;
        }

        return 'data:image/png;base64,' . base64_encode($imageData);
    }

    public static function generateQRBase64($text, $size = 200, $level = 'M', $margin = 0) {
        $dataUrl = self::generateQRDataUrl($text, $size, $level, $margin);

        if (!$dataUrl) {
            return null;
        }

        $parts = explode(',', $dataUrl);
        return end($parts);
    }

    public static function generateSimpleSVGQR($text) {

        $encoded = base64_encode($text);
        return "QR:{$encoded}";
    }
}

?>
