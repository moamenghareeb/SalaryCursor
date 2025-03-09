/**
 * Utility functions for exporting data in various formats
 */

// Helper to check if a value is a Date
function isDate(value: any): boolean {
  return Object.prototype.toString.call(value) === '[object Date]';
}

// Convert data to CSV format
export function convertToCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  // Create header row
  const headerRow = columns.map(col => `"${col.header}"`).join(',');
  
  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key];
      // Handle different data types
      if (value === null || value === undefined) {
        return '""';
      } else if (typeof value === 'string') {
        // Escape quotes in strings
        return `"${value.replace(/"/g, '""')}"`;
      } else if (isDate(value) || (typeof value === 'object' && value && 'toISOString' in value)) {
        return `"${value.toISOString()}"`;
      } else {
        return `"${value}"`;
      }
    }).join(',');
  });
  
  // Combine header and rows
  return [headerRow, ...rows].join('\n');
}

// Download CSV file
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  // Create download link
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Convert data to Excel format (using CSV as base)
export function downloadExcel<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  filename: string
): void {
  // Convert to CSV first
  const csvContent = convertToCSV(data, columns);
  
  // Create Excel-compatible blob
  // Excel opens CSV files but expects UTF-8 BOM for proper encoding
  const excelContent = '\uFEFF' + csvContent; // Add BOM character
  const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export data in the specified format
export function exportData<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  format: 'csv' | 'excel' | 'pdf',
  filename: string
): void {
  switch (format) {
    case 'csv':
      const csvContent = convertToCSV(data, columns);
      downloadCSV(csvContent, `${filename}.csv`);
      break;
    case 'excel':
      downloadExcel(data, columns, `${filename}.xlsx`);
      break;
    case 'pdf':
      // PDF export would typically be handled by a library like jsPDF
      // or by sending the data to a server endpoint that generates PDFs
      console.warn('PDF export requires additional implementation');
      break;
    default:
      console.error('Unsupported export format');
  }
} 