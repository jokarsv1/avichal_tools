/**
 * Tiny dependency-free SVG charts for calculators.
 * Colours come from CSS tokens (--series-1..3) validated for colour-blind separation in light and dark mode.
 * Every chart also has a data table on the page, and values are direct-labelled (identity never by colour alone).
 */

export interface Series { name: string; color: string; values: number[] }

const NS = 'http://www.w3.org/2000/svg';
const el = (tag: string, attrs: Record<string, string | number>) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  return (steps.find((x) => n <= x) ?? 10) * p;
}

/** One horizontal 100% bar split into parts, with labels underneath (part-to-whole for 2–3 parts). */
export function splitBar(host: HTMLElement, parts: { name: string; color: string; value: number }[], fmt: (n: number) => string) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0) || 1;
  host.replaceChildren();
  const bar = document.createElement('div');
  bar.className = 'viz-split';
  bar.setAttribute('role', 'img');
  bar.setAttribute('aria-label', parts.map((p) => `${p.name} ${fmt(p.value)} (${Math.round((p.value / total) * 100)}%)`).join(', '));
  for (const p of parts) {
    const seg = document.createElement('span');
    seg.style.flexGrow = String(Math.max(0, p.value) / total);
    seg.style.background = p.color;
    seg.title = `${p.name}: ${fmt(p.value)}`;
    bar.append(seg);
  }
  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.innerHTML = parts.map((p) => `<span><i style="background:${p.color}"></i>${p.name} <b>${fmt(p.value)}</b> (${Math.round((p.value / total) * 100)}%)</span>`).join('');
  host.append(bar, legend);
}

/** Stacked columns (e.g. invested + gains per year) with a hover tooltip. */
export function stackedColumns(host: HTMLElement, labels: string[], series: Series[], fmt: (n: number) => string, opts: { title?: string } = {}) {
  host.replaceChildren();
  // Size the viewBox to the real width so text stays 11px on phones.
  const W = Math.max(300, Math.min(900, host.clientWidth || 640)), H = W < 500 ? 220 : 260, L = 52, R = 8, T = 12, B = 28;
  const totals = labels.map((_, i) => series.reduce((s, x) => s + Math.max(0, x.values[i] || 0), 0));
  const max = niceMax(Math.max(...totals, 1));
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.title || 'Chart' }) as SVGSVGElement;
  const plotW = W - L - R, plotH = H - T - B;
  // recessive grid + y labels
  for (let k = 0; k <= 4; k++) {
    const v = (max * k) / 4, y = T + plotH - (plotH * k) / 4;
    svg.append(el('line', { x1: L, x2: W - R, y1: y, y2: y, class: 'viz-grid' }));
    const t = el('text', { x: L - 6, y: y + 4, 'text-anchor': 'end', class: 'viz-axis' });
    t.textContent = fmt(v);
    svg.append(t);
  }
  const n = labels.length;
  const slot = plotW / n;
  const bw = Math.max(3, Math.min(28, slot * 0.62));
  const step = Math.max(1, Math.ceil(n / Math.max(4, Math.floor(plotW / 52))));
  labels.forEach((lab, i) => {
    const x = L + slot * i + (slot - bw) / 2;
    let y = T + plotH;
    const g = el('g', { class: 'viz-col', tabindex: 0 });
    series.forEach((s, si) => {
      const v = Math.max(0, s.values[i] || 0);
      const hgt = (v / max) * plotH;
      if (hgt <= 0) return;
      const top = si === series.length - 1 || series.slice(si + 1).every((x) => !(x.values[i] > 0));
      const gap = si > 0 ? 2 : 0; // 2px surface gap between stacked fills
      const r = top ? Math.min(4, bw / 2, hgt / 2) : 0;
      const yy = y - hgt;
      const h2 = Math.max(0, hgt - gap);
      // path with rounded top corners only on the top segment
      const d = r
        ? `M${x},${yy + h2 + 0}V${yy + r}Q${x},${yy} ${x + r},${yy}H${x + bw - r}Q${x + bw},${yy} ${x + bw},${yy + r}V${yy + h2}Z`
        : `M${x},${yy}H${x + bw}V${yy + h2}H${x}Z`;
      g.append(el('path', { d, fill: s.color }));
      y = yy;
    });
    // invisible, larger hit target
    g.append(el('rect', { x: L + slot * i, y: T, width: slot, height: plotH, fill: 'transparent' }));
    g.addEventListener('pointerenter', () => show(i));
    g.addEventListener('focus', () => show(i));
    g.addEventListener('pointerleave', hide);
    g.addEventListener('blur', hide);
    svg.append(g);
    if (i % step === 0 || i === n - 1) {
      const t = el('text', { x: L + slot * i + slot / 2, y: H - 8, 'text-anchor': 'middle', class: 'viz-axis' });
      t.textContent = lab;
      svg.append(t);
    }
  });
  const tip = document.createElement('div');
  tip.className = 'viz-tip hidden';
  const wrap = document.createElement('div');
  wrap.className = 'viz-wrap';
  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.innerHTML = series.map((s) => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join('');
  wrap.append(svg, tip);
  host.append(legend, wrap);

  function show(i: number) {
    tip.innerHTML = `<b>${labels[i]}</b>` + series.map((s) => `<div><i style="background:${s.color}"></i>${s.name}: <b>${fmt(s.values[i] || 0)}</b></div>`).join('') + (series.length > 1 ? `<div>Total: <b>${fmt(totals[i])}</b></div>` : '');
    tip.classList.remove('hidden');
    const pct = (L + slot * (i + 0.5)) / W;
    tip.style.left = `${Math.min(78, Math.max(2, pct * 100 - 10))}%`;
  }
  function hide() { tip.classList.add('hidden'); }
}
