/** QR helpers on top of the MIT `qrcode` package (loaded lazily). */
export interface QrStyle { fg: string; bg: string; ecc: 'L' | 'M' | 'Q' | 'H'; margin: number; logo?: HTMLImageElement | null }

const load = async () => ((await import('qrcode')) as any).default ?? (await import('qrcode'));

export async function qrCanvas(text: string, size: number, s: QrStyle): Promise<HTMLCanvasElement> {
  const QR = await load();
  const c = document.createElement('canvas');
  await QR.toCanvas(c, text, { width: size, margin: s.margin, errorCorrectionLevel: s.logo ? 'H' : s.ecc, color: { dark: s.fg, light: s.bg } });
  if (s.logo) {
    const ctx = c.getContext('2d')!;
    const box = Math.round(c.width * 0.22), x = (c.width - box) / 2, y = (c.height - box) / 2, r = box * 0.18;
    ctx.fillStyle = s.bg;
    ctx.beginPath();
    ctx.roundRect(x - 6, y - 6, box + 12, box + 12, r);
    ctx.fill();
    const k = Math.min(box / s.logo.naturalWidth, box / s.logo.naturalHeight);
    const w = s.logo.naturalWidth * k, h = s.logo.naturalHeight * k;
    ctx.drawImage(s.logo, (c.width - w) / 2, (c.height - h) / 2, w, h);
  }
  return c;
}

export async function qrSvg(text: string, s: QrStyle, logoDataUrl?: string): Promise<string> {
  const QR = await load();
  let svg: string = await QR.toString(text, { type: 'svg', margin: s.margin, errorCorrectionLevel: logoDataUrl ? 'H' : s.ecc, color: { dark: s.fg, light: s.bg } });
  if (logoDataUrl) {
    const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    const n = m ? +m[1] : 33;
    const box = n * 0.22, o = (n - box) / 2;
    svg = svg.replace('</svg>', `<rect x="${o - 0.4}" y="${o - 0.4}" width="${box + 0.8}" height="${box + 0.8}" rx="${box * 0.18}" fill="${s.bg}"/><image href="${logoDataUrl}" x="${o}" y="${o}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid meet"/></svg>`);
  }
  return svg;
}

/** Relative luminance contrast ratio between two hex colours (QR scanners need strong contrast). */
export function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const v = hex.replace('#', '').match(/.{2}/g)!.map((x) => parseInt(x, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');
export function wifiPayload(ssid: string, pass: string, type: 'WPA' | 'WEP' | 'nopass', hidden: boolean) {
  return `WIFI:T:${type};S:${esc(ssid)};${type !== 'nopass' ? `P:${esc(pass)};` : ''}${hidden ? 'H:true;' : ''};`;
}
export function vcardPayload(v: { first: string; last: string; org: string; title: string; phone: string; email: string; url: string; address: string }) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${v.last};${v.first};;;`, `FN:${[v.first, v.last].filter(Boolean).join(' ')}`];
  if (v.org) lines.push(`ORG:${v.org}`);
  if (v.title) lines.push(`TITLE:${v.title}`);
  if (v.phone) lines.push(`TEL;TYPE=CELL:${v.phone}`);
  if (v.email) lines.push(`EMAIL:${v.email}`);
  if (v.url) lines.push(`URL:${v.url}`);
  if (v.address) lines.push(`ADR:;;${v.address};;;;`);
  lines.push('END:VCARD');
  return lines.join('\n');
}
/** NPCI UPI deep link. Amount optional; cu=INR. */
export function upiPayload(pa: string, pn: string, am?: string, tn?: string) {
  const p = new URLSearchParams();
  p.set('pa', pa.trim());
  if (pn.trim()) p.set('pn', pn.trim());
  if (am && +am > 0) p.set('am', (+am).toFixed(2));
  if (tn?.trim()) p.set('tn', tn.trim().slice(0, 80));
  p.set('cu', 'INR');
  return `upi://pay?${p.toString().replace(/\+/g, '%20')}`;
}
export const isVpa = (v: string) => /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,63}$/.test(v.trim());
