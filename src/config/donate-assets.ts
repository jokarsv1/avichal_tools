/**
 * Donation images you upload yourself. Put them in `public/donate/` and rebuild:
 *   public/donate/paytm-qr.png    (or .jpg / .jpeg / .webp)  your Paytm / UPI QR code
 *   public/donate/paytm-logo.svg  (or .png / .webp)          the Paytm logo (optional)
 * Nothing to configure: the support box on every page shows them automatically when present.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'public', 'donate');
function find(base: string, exts: string[]): string {
  for (const e of exts) if (fs.existsSync(path.join(DIR, `${base}.${e}`))) return `/donate/${base}.${e}`;
  return '';
}

export const DONATE_ASSETS = {
  paytmQr: find('paytm-qr', ['png', 'jpg', 'jpeg', 'webp']),
  paytmLogo: find('paytm-logo', ['svg', 'png', 'webp']),
};
