package pe.marcona.mtc.controller;

import pe.marcona.mtc.dto.ReportRequest;

import com.google.common.collect.ImmutableList;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** API REST para estado del servicio y exportación de reportes a Excel. */
@RestController
@RequestMapping("/api")
public class ReportController {
    private static final Logger log = LoggerFactory.getLogger(ReportController.class);
    private static final int MAX_REGISTROS = 10_000;
    private static final int MAX_COLUMNAS = 16_384;
    private static final int MAX_CARACTERES_CELDA = 32_767;

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("servicio", "MTC Marcona Java", "estado", "activo", "fechaHora", LocalDateTime.now().toString());
    }

    /** Recibe registros JSON y devuelve un archivo .xlsx descargable. */
    @PostMapping(value = "/reportes/excel", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> exportarExcel(@RequestBody ReportRequest request) throws IOException {
        if (request == null || request.registros() == null || request.registros().isEmpty()) {
            return error("Debe enviar al menos un registro.");
        }
        if (request.registros().size() > MAX_REGISTROS) {
            return error("El límite es " + MAX_REGISTROS + " registros.");
        }
        if (request.registros().stream().anyMatch(Objects::isNull)) {
            return error("Cada registro debe ser un objeto JSON.");
        }

        // Copia las filas para que no cambien mientras se genera el archivo.
        List<Map<String, Object>> rows = ImmutableList.copyOf(request.registros().stream()
                .map(row -> Collections.unmodifiableMap(new LinkedHashMap<>(row)))
                .toList());
        // Apache Commons Lang: sanea el nombre de la hoja y título.
        String titulo = StringUtils.defaultIfBlank(request.titulo(), "Reporte MTC Marcona")
                .replaceAll("[\\[\\]*?/\\\\:]", " ")
                .trim();
        titulo = StringUtils.abbreviate(StringUtils.defaultIfBlank(titulo, "Reporte MTC Marcona"), 80);

        // Mantiene un orden de columnas coherente según la primera aparición.
        LinkedHashSet<String> columnSet = new LinkedHashSet<>();
        rows.forEach(row -> columnSet.addAll(row.keySet()));
        List<String> columns = new ArrayList<>(columnSet);
        if (columns.isEmpty()) {
            return error("Los registros no contienen columnas.");
        }
        if (columns.size() > MAX_COLUMNAS) {
            return error("El límite es " + MAX_COLUMNAS + " columnas.");
        }
        if (columns.stream().anyMatch(column -> column.length() > MAX_CARACTERES_CELDA)) {
            return error("Los nombres de columna no pueden superar " + MAX_CARACTERES_CELDA + " caracteres.");
        }
        for (Map<String, Object> row : rows) {
            for (String column : columns) {
                Object value = row.get(column);
                if (value != null && String.valueOf(value).length() > MAX_CARACTERES_CELDA) {
                    return error("Los valores de celda no pueden superar " + MAX_CARACTERES_CELDA + " caracteres.");
                }
            }
        }

        byte[] file;
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(StringUtils.abbreviate(titulo, 31));
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row titleRow = sheet.createRow(0);
            titleRow.createCell(0).setCellValue(titulo);
            Row header = sheet.createRow(2);
            for (int c = 0; c < columns.size(); c++) {
                Cell cell = header.createCell(c);
                cell.setCellValue(columns.get(c));
                cell.setCellStyle(headerStyle);
            }
            int rowIndex = 3;
            for (Map<String, Object> record : rows) {
                Row excelRow = sheet.createRow(rowIndex++);
                for (int c = 0; c < columns.size(); c++) {
                    Object value = record.get(columns.get(c));
                    Cell cell = excelRow.createCell(c);
                    if (value == null) cell.setBlank();
                    else if (value instanceof Number n) cell.setCellValue(n.doubleValue());
                    else if (value instanceof Boolean b) cell.setCellValue(b);
                    else cell.setCellValue(String.valueOf(value));
                }
            }
            for (int c = 0; c < columns.size(); c++) sheet.autoSizeColumn(c);
            workbook.write(out);
            file = out.toByteArray();
        }

        String filename = "reporte-mtc-marcona-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")) + ".xlsx";
        log.info("Reporte Excel generado: {} registros, {} columnas", rows.size(), columns.size());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .contentLength(file.length)
                .body(file);
    }

    private ResponseEntity<byte[]> error(String message) {
        return ResponseEntity.badRequest()
                .contentType(MediaType.parseMediaType("text/plain;charset=UTF-8"))
                .body(message.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
