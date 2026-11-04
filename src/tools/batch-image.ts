import { onFiles, downloadBlob, downloadZip, formatBytes, baseName, h } from '../lib/ui';
import { decodeImage, drawScaled, makeCanvas, canvasToBlob, compressPng, extFor, canEncodeWebp, type OutType } from '../lib/image';

interface Item {
  file: File;
  li: HTMLLIElement;
  out?: Blob;
  outName?: string;
  thumb?: string;
}

export function initBatchImage(root: HTMLElement) {
  const mode = root.dataset.mode as 'compress' | 'resize' | 'convert';
  const q = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector(s) as T | null;
  const list = q('.bi-list')!;
  const results = q('.bi-results')!;
  const zipBtn = q<HTMLButtonElement>('.bi-zip')!;
  const summary = q('.bi-summary')!;
  const fmt = q<HTMLSelectElement>('.bi-fmt')!;
  const qual = q<HTMLInputElement>('.bi-q')!;
  const qv = q('.bi-qv')!;
  const maxW = q<HTMLSelectElement>('.bi-max');
  const preset = q<HTMLSelectElement>('.bi-preset');
  const wEl = q<HTMLInputElement>('.bi-w');
  const hEl = q<HTMLInputElement>('.bi-h');
  const pct = q<HTMLInputElement>('.bi-pct');
  const fitEl = q<HTMLSelectElement>('.bi-fit');
  const bgEl = q<HTMLInputElement>('.bi-bg');
  let items: Item[] = [];
  let run = 0;

  preset?.addEventListener('change', () => {
    const [w, hh] = (preset.value || 'x').split('x');
    wEl!.value = w || '';
    hEl!.value = hh || '';
    if (preset.value) pct!.value = '';
  });
  pct?.addEventListener('input', () => { if (pct.value) { wEl!.value = ''; hEl!.value = ''; preset!.value = ''; } });
  [wEl, hEl].forEach((el) => el?.addEventListener('input', () => { preset!.value = ''; pct!.value = ''; }));
  qual.addEventListener('input', () => (qv.textContent = qual.value));
  root.querySelectorAll('.bi-options input, .bi-options select').forEach((el) => el.addEventListener('change', schedule));
  qual.addEventListener('change', schedule);

  let timer: number | undefined;
  function schedule() { clearTimeout(timer); timer = window.setTimeout(processAll, 300); }

  function outTypeFor(f: File): OutType {
    if (fmt.value !== 'keep') return fmt.value as OutType;
    if (/png|gif|bmp|svg/i.test(f.type) || /\.(png|gif|bmp|svg)$/i.test(f.name)) return 'image/png';
    if (/webp/i.test(f.type)) return 'image/webp';
    return 'image/jpeg';
  }

  function targetSize(w: number, hh: number): { cw: number; ch: number; dx: number; dy: number; dw: number; dh: number } {
    let cw = w, ch = hh;
    if (mode === 'compress' && maxW && +maxW.value && w > +maxW.value) { cw = +maxW.value; ch = Math.round((hh * cw) / w); }
    if (mode === 'resize') {
      const W = parseInt(wEl!.value) || 0, H = parseInt(hEl!.value) || 0, P = parseFloat(pct!.value) || 0;
      if (P) { cw = Math.max(1, Math.round((w * P) / 100)); ch = Math.max(1, Math.round((hh * P) / 100)); }
      else if (W && H) {
        const fit = fitEl!.value;
        if (fit === 'stretch') return { cw: W, ch: H, dx: 0, dy: 0, dw: W, dh: H };
        if (fit === 'fit') { const s = Math.min(W / w, H / hh); cw = Math.round(w * s); ch = Math.round(hh * s); }
        else {
          const s = fit === 'fill' ? Math.max(W / w, H / hh) : Math.min(W / w, H / hh);
          const dw = w * s, dh = hh * s;
          return { cw: W, ch: H, dx: (W - dw) / 2, dy: (H - dh) / 2, dw, dh };
        }
      } else if (W) { cw = W; ch = Math.round((hh * W) / w); }
      else if (H) { ch = H; cw = Math.round((w * H) / hh); }
    }
    return { cw, ch, dx: 0, dy: 0, dw: cw, dh: ch };
  }

  async function processOne(it: Item, myRun: number) {
    const status = it.li.querySelector('.size')!;
    status.textContent = `${formatBytes(it.file.size)} → processing…`;
    try {
      const bmp = await decodeImage(it.file);
      if (myRun !== run) { bmp.close(); return; }
      let type = outTypeFor(it.file);
      if (type === 'image/webp' && !(await canEncodeWebp())) type = 'image/png';
      const ow = bmp.width;
      const g = targetSize(bmp.width, bmp.height);
      const needsBg = type === 'image/jpeg' || (mode === 'resize' && fitEl?.value === 'pad');
      const bg = bgEl?.value || '#ffffff';
      const scaled = g.dw === bmp.width && g.dh === bmp.height ? bmp : drawScaled(bmp, Math.max(1, Math.round(g.dw)), Math.max(1, Math.round(g.dh)));
      const c = makeCanvas(g.cw, g.ch);
      const ctx = c.getContext('2d')!;
      if (needsBg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.drawImage(scaled, g.dx, g.dy, g.dw, g.dh);
      bmp.close();
      const qq = +qual.value / 100;
      let out: Blob;
      if (type === 'image/png') out = mode === 'compress' && +qual.value < 100 ? await compressPng(c, 256) : await canvasToBlob(c, 'image/png');
      else out = await canvasToBlob(c, type, qq);
      if (myRun !== run) return;
      // Never hand back a bigger file when the user only wanted compression.
      const sameFmt = out.type === (it.file.type || out.type);
      let note = '';
      if (mode === 'compress' && sameFmt && out.size >= it.file.size && g.cw === ow) { out = it.file; note = ' (already optimised, kept original)'; }
      it.out = out;
      it.outName = `${baseName(it.file.name)}${mode === 'compress' ? '-compressed' : mode === 'resize' ? `-${g.cw}x${g.ch}` : ''}.${extFor(out.type || type)}`;
      const diff = Math.round((1 - out.size / it.file.size) * 100);
      status.innerHTML = `${formatBytes(it.file.size)} → <b>${formatBytes(out.size)}</b> ${diff > 0 ? `<span class="badge ok">−${diff}%</span>` : diff < 0 ? `<span class="badge">+${-diff}%</span>` : ''} · ${g.cw}×${g.ch}${note}`;
      const btn = it.li.querySelector<HTMLButtonElement>('.dl')!;
      btn.disabled = false;
    } catch (e) {
      status.innerHTML = `<span class="badge err">Could not read this image</span>`;
      console.warn(e);
    }
  }

  async function processAll() {
    const myRun = ++run;
    zipBtn.disabled = true;
    for (const it of items) { it.out = undefined; it.li.querySelector<HTMLButtonElement>('.dl')!.disabled = true; }
    for (const it of items) {
      if (myRun !== run) return;
      await processOne(it, myRun);
    }
    if (myRun !== run) return;
    const done = items.filter((i) => i.out);
    const before = done.reduce((s, i) => s + i.file.size, 0), after = done.reduce((s, i) => s + i.out!.size, 0);
    summary.textContent = `${done.length} image${done.length === 1 ? '' : 's'} · ${formatBytes(before)} → ${formatBytes(after)}${before > after ? ` (saved ${Math.round((1 - after / before) * 100)}%)` : ''}`;
    zipBtn.disabled = done.length === 0;
  }

  function addFiles(files: File[]) {
    results.classList.remove('hidden');
    for (const file of files) {
      const thumb = h('span', { class: 'thumb', text: '🖼️' });
      const li = h('li', { class: 'file-item' },
        thumb,
        h('div', { class: 'meta' }, h('div', { class: 'name', text: file.name }), h('div', { class: 'size', text: formatBytes(file.size) })),
        h('div', { class: 'actions' },
          h('button', { class: 'btn btn-sm dl', type: 'button', disabled: true, text: '⬇', title: 'Download', 'aria-label': `Download ${file.name}` }),
          h('button', { class: 'icon-btn rm', type: 'button', text: '✕', title: 'Remove', 'aria-label': `Remove ${file.name}` })),
      );
      const it: Item = { file, li };
      if (!/hei[cf]/i.test(file.type + file.name)) {
        it.thumb = URL.createObjectURL(file);
        thumb.replaceChildren(h('img', { src: it.thumb, alt: '', loading: 'lazy', class: 'thumb' }));
      }
      li.querySelector('.dl')!.addEventListener('click', () => it.out && downloadBlob(it.out, it.outName!));
      li.querySelector('.rm')!.addEventListener('click', () => {
        items = items.filter((x) => x !== it);
        li.remove();
        if (it.thumb) URL.revokeObjectURL(it.thumb);
        if (!items.length) results.classList.add('hidden');
      });
      list.append(li);
      items.push(it);
    }
    processAll();
  }

  onFiles(q('#bi-drop')!, addFiles);
  zipBtn.addEventListener('click', async () => {
    const done = items.filter((i) => i.out);
    if (done.length === 1) return downloadBlob(done[0].out!, done[0].outName!);
    zipBtn.disabled = true;
    await downloadZip(done.map((i) => ({ name: i.outName!, data: i.out! })), `images-${mode}.zip`);
    zipBtn.disabled = false;
  });
  q('.bi-clear')!.addEventListener('click', () => {
    run++;
    items.forEach((i) => i.thumb && URL.revokeObjectURL(i.thumb));
    items = [];
    list.replaceChildren();
    results.classList.add('hidden');
  });
}
