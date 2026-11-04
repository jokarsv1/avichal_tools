/** Helpers for generating simple business documents (receipts, invoices) with pdf-lib. */
import type { PDFFont, PDFPage } from 'pdf-lib';

/** Standard PDF fonts only cover Latin (WinAnsi). Replace ₹ with Rs. and drop anything unsupported. */
export function latin(s: string, font: PDFFont): string {
  const t = (s || '').replace(/₹\s?/g, 'Rs. ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-');
  let out = '';
  for (const ch of t) {
    try { font.encodeText(ch); out += ch; } catch { out += '?'; }
  }
  return out;
}

export function hasNonLatin(...parts: string[]) {
  return parts.some((p) => /[^\u0000-ɏ₹“”‘’–—…•]/.test(p || ''));
}

/** Word-wrap text to a width; returns lines. */
export function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > width && line) { lines.push(line); line = word; }
      else line = test;
    }
    lines.push(line);
  }
  return lines;
}

/** Draw wrapped text; returns the y below the last line. */
export function para(page: PDFPage, text: string, opts: { x: number; y: number; width: number; size: number; font: PDFFont; color?: any; lineGap?: number }) {
  const lh = opts.size * (opts.lineGap ?? 1.35);
  let y = opts.y;
  for (const line of wrap(text, opts.font, opts.size, opts.width)) {
    page.drawText(line, { x: opts.x, y, size: opts.size, font: opts.font, color: opts.color });
    y -= lh;
  }
  return y;
}

export const money = (n: number) => 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function rightText(page: PDFPage, text: string, xRight: number, y: number, size: number, font: PDFFont, color?: any) {
  page.drawText(text, { x: xRight - font.widthOfTextAtSize(text, size), y, size, font, color });
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); // m 0-based
