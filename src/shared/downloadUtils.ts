import { formatDateForFilename } from './timeUtils';

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJson(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  download(blob, filename);
}

export function generateDownloadFilename(prefix = 'backlog-ai-ext_data', extension: string = 'json'): string {
  const timestamp = formatDateForFilename(new Date());
  return `${prefix}_${timestamp}.${extension}`;
}
