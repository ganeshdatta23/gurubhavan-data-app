/** Keep exported user text from being interpreted as a spreadsheet formula. */
export function sanitizeSpreadsheetValue(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}
