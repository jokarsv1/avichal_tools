/** Small DOM + file helpers shared by every tool. No framework, so pages stay tiny and fast. */

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`Element not found: ${sel}`);
  return el;
};
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, any> = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k in el && typeof v !== 'string') (el as any)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c) el.append(c);
  return el;
}

export function formatBytes(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '–';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < units.length - 1);
  return `${n.toFixed(n >= 100 ? 0 : digits)} ${units[i]}`;
}

export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  track('download', { ext: filename.split('.').pop() || '' });
}

/** Zip several files and download them (fflate is loaded only when needed). */
export async function downloadZip(files: { name: string; data: Blob | Uint8Array }[], zipName: string) {
  const { zip } = await import('fflate');
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  const used = new Set<string>();
  for (const f of files) {
    let name = f.name;
    let i = 1;
    while (used.has(name)) name = f.name.replace(/(\.[^.]+)?$/, `-${i++}$1`);
    used.add(name);
    const bytes = f.data instanceof Uint8Array ? f.data : new Uint8Array(await f.data.arrayBuffer());
    entries[name] = [bytes, { level: 0 }]; // already-compressed media: store only, much faster
  }
  const out = await new Promise<Uint8Array>((res, rej) => zip(entries, (err, data) => (err ? rej(err) : res(data))));
  downloadBlob(new Blob([out as BlobPart], { type: 'application/zip' }), zipName);
}

/** Wire up a <Dropzone>. Calls back with the picked files (click, drop or paste). */
export function onFiles(zone: HTMLElement, cb: (files: File[]) => void, opts: { paste?: boolean } = {}) {
  const input = zone.querySelector<HTMLInputElement>('input[type=file]')!;
  const accept = (input.accept || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const ok = (f: File) =>
    !accept.length ||
    accept.some((a) => (a.startsWith('.') ? f.name.toLowerCase().endsWith(a) : a.endsWith('/*') ? f.type.startsWith(a.slice(0, -1)) : f.type === a));
  const emit = (list: FileList | File[] | null) => {
    const files = Array.from(list || []);
    const good = files.filter(ok);
    if (files.length && !good.length) {
      alert(`That file type isn't supported here. Accepted: ${input.accept}`);
      return;
    }
    if (good.length) {
      cb(input.multiple ? good : [good[0]]);
      track('file_added', { count: good.length });
    }
  };
  input.addEventListener('change', () => { emit(input.files); input.value = ''; });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('drag'); emit(e.dataTransfer?.files ?? null); });
  if (opts.paste !== false) {
    window.addEventListener('paste', (e) => {
      const files = Array.from(e.clipboardData?.files || []);
      if (files.length && !(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) emit(files);
    });
  }
}

export function setStatus(el: HTMLElement, msg: string, kind: 'info' | 'ok' | 'warn' | 'err' = 'info') {
  el.className = `status ${kind}`;
  el.textContent = msg;
}

export function setProgress(bar: HTMLElement, fraction: number) {
  const i = bar.querySelector('i') as HTMLElement;
  bar.classList.remove('hidden');
  i.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
}

/** Give the browser a chance to paint between heavy steps. */
export const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));

/** Privacy-safe usage events (no file names, no content). No-op unless GA4 is configured. */
export function track(event: string, params: Record<string, string | number> = {}) {
  const tool = location.pathname.replace(/^\//, '') || 'home';
  const w = window as any;
  if (typeof w.gtag === 'function') w.gtag('event', event, { tool, ...params });
}

export function errorMessage(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/encrypt|password/i.test(m)) return 'This PDF is password-protected. Remove the password first, then try again.';
  if (/memory|allocation|RangeError/i.test(m)) return 'Your device ran out of memory for this file. Try a smaller file or close other tabs.';
  return m || 'Something went wrong.';
}

/** Read/write tool settings in localStorage, safely (private mode, quotas). */
export const store = {
  get<T>(key: string, fallback: T): T {
    try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
  },
  set(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};

/** Sync calculator inputs with the URL (?a=1&b=2) so results can be shared on WhatsApp etc. */
export function bindUrlState(inputs: Record<string, HTMLInputElement | HTMLSelectElement>, onChange: () => void) {
  const params = new URLSearchParams(location.search);
  for (const [k, el] of Object.entries(inputs)) {
    const v = params.get(k);
    if (v != null) {
      if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = v === '1';
      else el.value = v;
    }
  }
  let t: number | undefined;
  const sync = () => {
    clearTimeout(t);
    t = window.setTimeout(() => {
      const p = new URLSearchParams();
      for (const [k, el] of Object.entries(inputs)) {
        p.set(k, el instanceof HTMLInputElement && el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value);
      }
      history.replaceState(null, '', `${location.pathname}?${p}`);
    }, 400);
    onChange();
  };
  for (const el of Object.values(inputs)) {
    el.addEventListener('input', sync);
    el.addEventListener('change', sync);
  }
  onChange();
}

export async function shareOrCopy(text: string, url = location.href): Promise<string> {
  const nav = navigator as any;
  if (nav.share) {
    try { await nav.share({ title: document.title, text, url }); return 'Shared'; } catch { /* cancelled */ }
  }
  try { await navigator.clipboard.writeText(url); return 'Link copied'; } catch { return 'Copy the address bar link to share'; }
}
