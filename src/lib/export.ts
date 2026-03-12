import * as XLSX from 'xlsx';
import { Finding } from './gemini';

export function exportToExcel(findings: Finding[], filename: string = 'Audit_Findings.xlsx') {
  const worksheet = XLSX.utils.json_to_sheet(findings);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Findings');
  XLSX.writeFile(workbook, filename);
}
