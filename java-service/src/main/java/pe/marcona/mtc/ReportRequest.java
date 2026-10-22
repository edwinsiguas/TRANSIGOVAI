package pe.marcona.mtc;

import java.util.List;
import java.util.Map;

/** Datos recibidos para crear un reporte tabular en Excel. */
public record ReportRequest(String titulo, List<Map<String, Object>> registros) { }
