type ReportValue = string | number | boolean | null

const JAVA_API_URL = (
  import.meta.env.VITE_JAVA_API_URL || 'http://localhost:8081/api'
).replace(/\/+$/, '')

export async function generateJavaExcelReport(
  title: string,
  records: Array<Record<string, ReportValue>>,
): Promise<Blob> {
  let response: Response

  try {
    response = await fetch(`${JAVA_API_URL}/reportes/excel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: title, registros: records }),
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'No se pudo conectar con Java Spring Boot. Comprueba que el servicio esté activo en el puerto 8081.',
      )
    }
    throw error
  }

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Java Spring Boot respondió con HTTP ${response.status}.`)
  }

  const contentType = response.headers.get('Content-Type') || ''
  if (!contentType.includes('spreadsheetml')) {
    throw new Error('Java Spring Boot no devolvió un archivo Excel válido.')
  }

  return response.blob()
}

export async function downloadJavaExcelReport(
  title: string,
  records: Array<Record<string, ReportValue>>,
  filenamePrefix: string,
): Promise<void> {
  const workbook = await generateJavaExcelReport(title, records)
  const url = URL.createObjectURL(workbook)
  const link = document.createElement('a')
  const dateStamp = new Date().toISOString().slice(0, 10)

  link.href = url
  link.download = `${filenamePrefix}_${dateStamp}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
