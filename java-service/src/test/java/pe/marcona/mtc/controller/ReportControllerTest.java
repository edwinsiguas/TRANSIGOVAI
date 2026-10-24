package pe.marcona.mtc.controller;

import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReportController.class)
class ReportControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthReportsServiceAsActive() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(content().json("""
                        {"servicio":"MTC Marcona Java","estado":"activo"}
                        """));
    }

    @Test
    void exportsJsonRecordsAsAnExcelWorkbook() throws Exception {
        var response = mockMvc.perform(post("/api/reportes/excel")
                        .contentType("application/json")
                        .content("""
                                {
                                  "titulo":"Reporte de vehículos",
                                  "registros":[
                                    {"placa":"ABC-123","empresa":"Empresa de ejemplo","activo":true},
                                    {"placa":"XYZ-789","empresa":"Marcona Express","activo":false}
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andReturn()
                .getResponse();

        assertThat(response.getHeader("Content-Disposition"))
                .startsWith("attachment; filename=\"reporte-mtc-marcona-");
        try (var workbook = WorkbookFactory.create(new ByteArrayInputStream(response.getContentAsByteArray()))) {
            var sheet = workbook.getSheetAt(0);
            assertThat(sheet.getRow(2).getCell(0).getStringCellValue()).isEqualTo("placa");
            assertThat(sheet.getRow(2).getCell(1).getStringCellValue()).isEqualTo("empresa");
            assertThat(sheet.getRow(2).getCell(2).getStringCellValue()).isEqualTo("activo");
            assertThat(sheet.getRow(3).getCell(0).getStringCellValue()).isEqualTo("ABC-123");
            assertThat(sheet.getRow(3).getCell(2).getBooleanCellValue()).isTrue();
            assertThat(sheet.getRow(4).getCell(0).getStringCellValue()).isEqualTo("XYZ-789");
            assertThat(sheet.getRow(4).getCell(2).getBooleanCellValue()).isFalse();
        }
    }

    @Test
    void rejectsEmptyRecordsWithAnActionableMessage() throws Exception {
        mockMvc.perform(post("/api/reportes/excel")
                        .contentType("application/json")
                        .content("""
                                {"titulo":"Vacío","registros":[]}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("text/plain"))
                .andExpect(content().string("Debe enviar al menos un registro."));
    }

    @Test
    void rejectsNullRowsInsteadOfFailingDuringWorkbookGeneration() throws Exception {
        mockMvc.perform(post("/api/reportes/excel")
                        .contentType("application/json")
                        .content("""
                                {"titulo":"Reporte","registros":[null]}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Cada registro debe ser un objeto JSON."));
    }
}
