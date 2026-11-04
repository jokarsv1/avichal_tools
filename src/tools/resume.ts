import { $, downloadBlob, setStatus, store, h } from '../lib/ui';
import { loadPdfLib, pdfBlob, openPdfJs, renderPage, closePdf } from '../lib/pdf';
import { latin } from '../lib/pdfdoc';

interface Exp { role: string; org: string; place: string; start: string; end: string; bullets: string }
interface Edu { degree: string; school: string; year: string; score: string }
interface Proj { name: string; link: string; bullets: string }
interface Resume {
  name: string; title: string; email: string; phone: string; location: string; links: string;
  summary: string; skills: string; experience: Exp[]; education: Edu[]; projects: Proj[]; certs: string; languages: string;
  template: 'classic' | 'modern' | 'compact'; accent: string;
}

const SAMPLE: Resume = {
  name: 'Priya Sharma', title: 'Software Engineer', email: 'priya.sharma@example.com', phone: '+91 98765 43210', location: 'Bengaluru, India',
  links: 'linkedin.com/in/priyasharma · github.com/priyasharma',
  summary: 'Backend engineer with 4 years of experience building payment and lending APIs used by 2M+ customers. Strong in Java, Go and AWS; led the migration of a monolith to services, cutting p95 latency by 45%.',
  skills: 'Java, Go, Python, Spring Boot, PostgreSQL, Kafka, Redis, AWS (EC2, Lambda, RDS), Docker, Kubernetes, CI/CD, System design',
  experience: [
    { role: 'Software Engineer II', org: 'FinPay Technologies', place: 'Bengaluru', start: 'Jul 2023', end: 'Present', bullets: 'Led the split of the payments monolith into 6 services; p95 latency down 45%\nBuilt an idempotent refunds API handling ₹300 Cr a month with zero double refunds\nMentored 3 junior engineers; introduced design reviews across the team' },
    { role: 'Software Engineer', org: 'LendQuick', place: 'Pune', start: 'Jun 2021', end: 'Jun 2023', bullets: 'Developed loan origination APIs in Spring Boot serving 40K applications a day\nReduced AWS costs by 28% by right-sizing RDS and adding Redis caching' },
  ],
  education: [{ degree: 'B.Tech, Computer Science', school: 'National Institute of Technology, Trichy', year: '2021', score: 'CGPA 8.6/10' }],
  projects: [{ name: 'Open-source rate limiter', link: 'github.com/priyasharma/ratelimit', bullets: 'Token-bucket rate limiter for Go services; 600+ GitHub stars' }],
  certs: 'AWS Certified Solutions Architect – Associate (2024)', languages: 'English, Hindi, Tamil', template: 'modern', accent: '#4f46e5',
};
const EMPTY: Resume = { name: '', title: '', email: '', phone: '', location: '', links: '', summary: '', skills: '', experience: [{ role: '', org: '', place: '', start: '', end: '', bullets: '' }], education: [{ degree: '', school: '', year: '', score: '' }], projects: [], certs: '', languages: '', template: 'modern', accent: '#4f46e5' };

let data: Resume = store.get('resume-draft', SAMPLE);
const form = $('#rs-form');
const status = $('#rs-status');

// ---------- Form rendering ----------
function field(label: string, value: string, onInput: (v: string) => void, opts: { area?: boolean; placeholder?: string; rows?: number } = {}) {
  const id = `rs-${Math.random().toString(36).slice(2, 8)}`;
  const input = opts.area ? h('textarea', { id, rows: opts.rows ?? 3, placeholder: opts.placeholder ?? '' }) : h('input', { id, type: 'text', placeholder: opts.placeholder ?? '' });
  (input as HTMLInputElement).value = value;
  input.addEventListener('input', () => { onInput((input as HTMLInputElement).value); changed(); });
  return h('div', { class: 'field' }, h('label', { for: id, text: label }), input);
}

function list<T>(title: string, items: T[], make: () => T, render: (it: T) => HTMLElement[]) {
  const box = h('fieldset', { class: 'card stack-sm', style: 'box-shadow:none' }, h('legend', {}, h('b', { text: title })));
  items.forEach((it, i) => {
    const row = h('div', { class: 'stack-sm rs-item' }, ...render(it),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn btn-sm', text: '↑', title: 'Move up', disabled: i === 0, onclick: () => { [items[i - 1], items[i]] = [items[i], items[i - 1]]; build(); changed(); } }),
        h('button', { type: 'button', class: 'btn btn-sm', text: '✕ Remove', onclick: () => { items.splice(i, 1); build(); changed(); } })));
    box.append(row);
  });
  box.append(h('button', { type: 'button', class: 'btn btn-sm', text: `➕ Add ${title.toLowerCase().replace(/s$/, '')}`, onclick: () => { items.push(make()); build(); changed(); } }));
  return box;
}

function build() {
  const d = data;
  form.replaceChildren(
    h('fieldset', { class: 'card stack-sm', style: 'box-shadow:none' }, h('legend', {}, h('b', { text: 'Personal details' })),
      h('div', { class: 'grid-2' },
        field('Full name', d.name, (v) => (d.name = v)), field('Job title', d.title, (v) => (d.title = v)),
        field('Email', d.email, (v) => (d.email = v)), field('Phone', d.phone, (v) => (d.phone = v)),
        field('Location', d.location, (v) => (d.location = v)), field('Links (LinkedIn, GitHub, portfolio)', d.links, (v) => (d.links = v)))),
    field('Professional summary', d.summary, (v) => (d.summary = v), { area: true, rows: 3, placeholder: '2–3 lines: who you are, years of experience, biggest wins.' }),
    list('Experience', d.experience, () => ({ role: '', org: '', place: '', start: '', end: '', bullets: '' }), (x) => [
      h('div', { class: 'grid-2' }, field('Role', x.role, (v) => (x.role = v)), field('Company', x.org, (v) => (x.org = v)), field('Location', x.place, (v) => (x.place = v)),
        h('div', { class: 'grid-2' }, field('Start', x.start, (v) => (x.start = v), { placeholder: 'Jan 2022' }), field('End', x.end, (v) => (x.end = v), { placeholder: 'Present' }))),
      field('Achievements (one per line)', x.bullets, (v) => (x.bullets = v), { area: true, rows: 4, placeholder: 'Start with a verb and add numbers: "Cut costs by 28% by…"' }),
    ]),
    list('Education', d.education, () => ({ degree: '', school: '', year: '', score: '' }), (x) => [
      h('div', { class: 'grid-2' }, field('Degree', x.degree, (v) => (x.degree = v)), field('College / school', x.school, (v) => (x.school = v)), field('Year', x.year, (v) => (x.year = v)), field('Score (optional)', x.score, (v) => (x.score = v))),
    ]),
    list('Projects', d.projects, () => ({ name: '', link: '', bullets: '' }), (x) => [
      h('div', { class: 'grid-2' }, field('Project name', x.name, (v) => (x.name = v)), field('Link', x.link, (v) => (x.link = v))),
      field('Details (one per line)', x.bullets, (v) => (x.bullets = v), { area: true, rows: 2 }),
    ]),
    field('Skills (comma separated)', d.skills, (v) => (d.skills = v), { area: true, rows: 2 }),
    h('div', { class: 'grid-2' }, field('Certifications (one per line)', d.certs, (v) => (d.certs = v), { area: true, rows: 2 }), field('Languages', d.languages, (v) => (d.languages = v))),
  );
}

// ---------- PDF generation ----------
async function makePdf(): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const doc = await PDFDocument.create();
  doc.setTitle(`${data.name || 'Resume'}${data.title ? ' – ' + data.title : ''}`);
  doc.setAuthor(data.name);
  const t = data.template;
  const serif = t === 'classic';
  const font = await doc.embedFont(serif ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
  const bold = await doc.embedFont(serif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);
  const ital = await doc.embedFont(serif ? StandardFonts.TimesRomanItalic : StandardFonts.HelveticaOblique);
  const hex = parseInt((data.accent || '#4f46e5').slice(1), 16);
  const accent = t === 'classic' ? rgb(0.1, 0.1, 0.1) : rgb(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
  const ink = rgb(0.12, 0.12, 0.16), grey = rgb(0.35, 0.35, 0.42);
  const W = 595.28, H = 841.89, M = t === 'compact' ? 40 : 48;
  const size = t === 'compact' ? 9.6 : serif ? 11 : 10.2;
  const lh = size * (t === 'compact' ? 1.32 : 1.42);
  let page = doc.addPage([W, H]);
  let y = H - M;
  const L = (s: string) => latin(s, font);
  const ensure = (need: number) => { if (y - need < M) { page = doc.addPage([W, H]); y = H - M; } };
  const wrap = (text: string, f: typeof font, sz: number, width: number) => {
    const out: string[] = [];
    let line = '';
    for (const w of L(text).split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(test, sz) > width && line) { out.push(line); line = w; } else line = test;
    }
    if (line) out.push(line);
    return out;
  };
  const text = (s: string, x: number, f = font, sz = size, color = ink) => page.drawText(L(s), { x, y, size: sz, font: f, color });
  const para = (s: string, x = M, width = W - 2 * M, f = font, color = ink) => { for (const ln of wrap(s, f, size, width)) { ensure(lh); text(ln, x, f, size, color); y -= lh; } };
  const heading = (s: string) => {
    ensure(lh * 3);
    y -= lh * 0.6;
    const label = t === 'classic' ? s.toUpperCase() : s;
    text(label, M, bold, size + (t === 'compact' ? 1.2 : 2), accent);
    y -= 5;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: t === 'modern' ? 1.2 : 0.6, color: t === 'modern' ? accent : rgb(0.7, 0.7, 0.75) });
    y -= lh;
  };
  const bullets = (s: string) => {
    for (const b of s.split('\n').map((x) => x.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)) {
      const lines = wrap(b, font, size, W - 2 * M - 14);
      lines.forEach((ln, i) => { ensure(lh); if (i === 0) text('•', M + 3); text(ln, M + 14); y -= lh; });
    }
  };

  // Header
  const nameSize = t === 'compact' ? 20 : 24;
  const nm = L(data.name || 'Your Name');
  if (t === 'classic') {
    page.drawText(nm, { x: (W - bold.widthOfTextAtSize(nm, nameSize)) / 2, y: y - nameSize * 0.8, size: nameSize, font: bold, color: ink });
    y -= nameSize + 12;
    const sub = [data.title, data.location].filter(Boolean).join(' · ');
    if (sub) { const s2 = L(sub); page.drawText(s2, { x: (W - font.widthOfTextAtSize(s2, size + 1) ) / 2, y, size: size + 1, font, color: grey }); y -= lh; }
    const contact = L([data.email, data.phone, data.links].filter(Boolean).join(' · '));
    for (const ln of wrap(contact, font, size, W - 2 * M)) { page.drawText(ln, { x: (W - font.widthOfTextAtSize(ln, size)) / 2, y, size, font, color: grey }); y -= lh; }
  } else {
    page.drawText(nm, { x: M, y: y - nameSize * 0.8, size: nameSize, font: bold, color: t === 'modern' ? accent : ink });
    y -= nameSize + 12;
    if (data.title) { text(data.title, M, bold, size + 1.5, ink); y -= lh + 1; }
    para([data.email, data.phone, data.location, data.links].filter(Boolean).join('  |  '), M, W - 2 * M, font, grey);
  }
  if (data.summary.trim()) { heading('Summary'); para(data.summary); }
  const exps = data.experience.filter((e) => e.role || e.org);
  if (exps.length) {
    heading('Experience');
    for (const e of exps) {
      ensure(lh * 3);
      text(e.role, M, bold);
      const dates = L([e.start, e.end].filter(Boolean).join(' – '));
      if (dates) page.drawText(dates, { x: W - M - font.widthOfTextAtSize(dates, size), y, size, font, color: grey });
      y -= lh;
      const sub = [e.org, e.place].filter(Boolean).join(', ');
      if (sub) { text(sub, M, ital, size, grey); y -= lh; }
      bullets(e.bullets);
      y -= lh * 0.35;
    }
  }
  const projs = data.projects.filter((p) => p.name);
  if (projs.length) {
    heading('Projects');
    for (const p of projs) {
      ensure(lh * 2);
      text(p.name, M, bold);
      if (p.link) { const l = L(p.link); page.drawText(l, { x: W - M - font.widthOfTextAtSize(l, size), y, size, font, color: grey }); }
      y -= lh;
      bullets(p.bullets);
      y -= lh * 0.3;
    }
  }
  const edus = data.education.filter((e) => e.degree || e.school);
  if (edus.length) {
    heading('Education');
    for (const e of edus) {
      ensure(lh * 2);
      text(e.degree, M, bold);
      if (e.year) { const yr = L(e.year); page.drawText(yr, { x: W - M - font.widthOfTextAtSize(yr, size), y, size, font, color: grey }); }
      y -= lh;
      const sub = [e.school, e.score].filter(Boolean).join(' · ');
      if (sub) { text(sub, M, ital, size, grey); y -= lh; }
      y -= lh * 0.2;
    }
  }
  if (data.skills.trim()) { heading('Skills'); para(data.skills.split(',').map((s) => s.trim()).filter(Boolean).join(' · ')); }
  if (data.certs.trim()) { heading('Certifications'); bullets(data.certs); }
  if (data.languages.trim()) { heading('Languages'); para(data.languages); }
  return doc.save();
}

// ---------- Preview, saving ----------
let timer: number | undefined, busy = false, pending = false;
async function preview() {
  if (busy) { pending = true; return; }
  busy = true;
  try {
    const bytes = await makePdf();
    const pdf = await openPdfJs(bytes);
    const holder = $('#rs-preview');
    const pages: HTMLCanvasElement[] = [];
    for (let i = 1; i <= pdf.numPages; i++) pages.push(await renderPage(pdf, i, 1.4));
    closePdf(pdf);
    holder.replaceChildren(...pages);
    $('#rs-pages').textContent = `${pages.length} page${pages.length === 1 ? '' : 's'}${pages.length > 1 ? ' · tip: most recruiters prefer 1 page for under 8 years of experience' : ''}`;
  } catch (e) { setStatus(status, String(e), 'err'); }
  busy = false;
  if (pending) { pending = false; preview(); }
}
function changed() {
  store.set('resume-draft', data);
  clearTimeout(timer);
  timer = window.setTimeout(preview, 500);
}

document.querySelectorAll<HTMLButtonElement>('[data-tpl]').forEach((b) => {
  b.setAttribute('aria-pressed', String(b.dataset.tpl === data.template));
  b.addEventListener('click', () => {
    data.template = b.dataset.tpl as Resume['template'];
    document.querySelectorAll('[data-tpl]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    changed();
  });
});
const accentEl = $<HTMLInputElement>('#rs-accent');
accentEl.value = data.accent;
accentEl.addEventListener('input', () => { data.accent = accentEl.value; changed(); });

$('#rs-download').addEventListener('click', async () => {
  const bytes = await makePdf();
  downloadBlob(pdfBlob(bytes), `${(data.name || 'resume').replace(/\s+/g, '-')}-Resume.pdf`);
  setStatus(status, 'Resume downloaded. Free forever: no watermark, no sign-up.', 'ok');
});
$('#rs-json').addEventListener('click', () => downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'resume-data.json'));
$<HTMLInputElement>('#rs-load').addEventListener('change', async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  try { data = { ...EMPTY, ...JSON.parse(await f.text()) }; build(); changed(); setStatus(status, 'Resume loaded.', 'ok'); }
  catch { setStatus(status, 'That file is not a resume data file.', 'err'); }
});
$('#rs-clear').addEventListener('click', () => { if (confirm('Start a blank resume? (Download your data first if you want to keep it.)')) { data = structuredClone(EMPTY); build(); changed(); } });
$('#rs-sample').addEventListener('click', () => { data = structuredClone(SAMPLE); build(); changed(); });

build();
preview();
