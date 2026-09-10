/**
 * Utility functions for exporting tabular report data to CSV and triggering browser print for PDF.
 */

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Downloads an array of row objects or cell arrays as a .csv file.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  extraSummaryLines: string[] = []
): void {
  const headerLine = headers.map(escapeCsvCell).join(',')
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(','))
  
  const contentParts = [headerLine, ...dataLines]
  if (extraSummaryLines.length > 0) {
    contentParts.push('')
    contentParts.push(...extraSummaryLines)
  }

  const csvContent = contentParts.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Triggers the system print dialog (allowing saving as PDF).
 */
export function triggerPrint(): void {
  if (typeof window !== 'undefined') {
    window.print()
  }
}
