import { $, onFiles, downloadBlob, setStatus, errorMessage, baseName, formatBytes } from '../lib/ui';
import { loadMediabunny, ensureEncoders, fmtTime, parseTime } from '../lib/media';

const canvas = $<HTMLCanvasElement>('#ac-wave');
const status = $('#ac-status');
const player = $<HTMLAudioElement>('#ac-player');
const el = (id: string) => document.getElementById(id) as HTMLInputElement;
let buf: AudioBuffer | null = null;
let file: File | null = null;
let sel = { a: 0, b: 30 };
let result: { blob: Blob; ext: string } | null = null;

function draw() {
  if (!buf) return;
  const W = (canvas.width = Math.round(canvas.clientWidth * (devicePixelRatio || 1)));
  const H = (canvas.height = Math.round(140 * (devicePixelRatio || 1)));
  const ctx = canvas.getContext('2d')!;
  const css = getComputedStyle(document.documentElement);
  ctx.fillStyle = css.getPropertyValue('--surface-2'); ctx.fillRect(0, 0, W, H);
  const data = buf.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / W));
  const xa = (sel.a / buf.duration) * W, xb = (sel.b / buf.duration) * W;
  ctx.fillStyle = css.getPropertyValue('--primary-soft'); ctx.fillRect(xa, 0, xb - xa, H);
  for (let x = 0; x < W; x++) {
    let min = 1, max = -1;
    for (let j = 0; j < step; j++) { const v = data[x * step + j] || 0; if (v < min) min = v; if (v > max) max = v; }
    ctx.fillStyle = x >= xa && x <= xb ? css.getPropertyValue('--primary') : css.getPropertyValue('--muted');
    ctx.fillRect(x, ((1 + min) / 2) * H, 1, Math.max(1, ((max - min) / 2) * H));
  }
  el('ac-start').value = fmtTime(sel.a);
  el('ac-end').value = fmtTime(sel.b);
  $('#ac-len').textContent = `Selection: ${fmtTime(sel.b - sel.a)}${el('ac-fmt').value === 'm4r' && sel.b - sel.a > 40 ? ' · iPhone ringtones must be 40 s or shorter' : ''}`;
}

let dragging: 'a' | 'b' | null = null;
canvas.addEventListener('pointerdown', (e) => {
  if (!buf) return;
  const t = ((e.offsetX / canvas.clientWidth) * buf.duration);
  dragging = Math.abs(t - sel.a) < Math.abs(t - sel.b) ? 'a' : 'b';
  sel[dragging] = t; if (sel.a > sel.b) [sel.a, sel.b] = [sel.b, sel.a];
  canvas.setPointerCapture(e.pointerId); draw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging || !buf) return;
  const t = Math.max(0, Math.min(buf.duration, (e.offsetX / canvas.clientWidth) * buf.duration));
  sel[dragging] = t;
  if (sel.a > sel.b) { [sel.a, sel.b] = [sel.b, sel.a]; dragging = dragging === 'a' ? 'b' : 'a'; }
  draw();
});
canvas.addEventListener('pointerup', () => (dragging = null));
['ac-start', 'ac-end'].forEach((id) => el(id).addEventListener('change', () => {
  if (!buf) return;
  sel.a = Math.max(0, parseTime(el('ac-start').value) ?? 0);
  sel.b = Math.min(buf.duration, parseTime(el('ac-end').value) ?? buf.duration);
  draw();
}));
el('ac-fmt').addEventListener('change', draw);
addEventListener('resize', draw);

$('#ac-play').addEventListener('click', () => {
  player.currentTime = sel.a;
  player.play();
  const stop = () => { if (player.currentTime >= sel.b) { player.pause(); player.removeEventListener('timeupdate', stop); } };
  player.addEventListener('timeupdate', stop);
});

onFiles($('#ac-drop'), async ([f]) => {
  file = f;
  setStatus(status, 'Decoding audio…', 'info');
  try {
    const ctx = new AudioContext();
    buf = await ctx.decodeAudioData(await f.arrayBuffer());
    ctx.close();
    if (player.src) URL.revokeObjectURL(player.src);
    player.src = URL.createObjectURL(f);
    sel = { a: 0, b: Math.min(buf.duration, 30) };
    $('#ac-panel').classList.remove('hidden');
    $('#ac-drop').classList.add('compact');
    draw();
    setStatus(status, `${f.name} · ${fmtTime(buf.duration)}. Drag on the waveform to select.`, 'info');
  } catch {
    setStatus(status, 'This file could not be decoded. Try MP3, M4A, WAV, OGG or an MP4 video.', 'err');
  }
});

$('#ac-go').addEventListener('click', async () => {
  if (!buf || !file) return;
  const go = $<HTMLButtonElement>('#ac-go');
  go.disabled = true;
  try {
    const fmt = el('ac-fmt').value as 'mp3' | 'm4a' | 'm4r' | 'wav';
    const sr = buf.sampleRate, ch = Math.min(2, buf.numberOfChannels);
    const a = Math.floor(sel.a * sr), b = Math.floor(sel.b * sr), n = b - a;
    if (n <= sr * 0.2) throw new Error('Select at least a fraction of a second.');
    const fadeIn = +el('ac-fadein').value * sr, fadeOut = +el('ac-fadeout').value * sr;
    const out = new AudioBuffer({ length: n, numberOfChannels: ch, sampleRate: sr });
    for (let c = 0; c < ch; c++) {
      const src = buf.getChannelData(c).subarray(a, b);
      const dst = out.getChannelData(c);
      for (let i = 0; i < n; i++) {
        let g = 1;
        if (fadeIn && i < fadeIn) g = i / fadeIn;
        if (fadeOut && i > n - fadeOut) g = Math.min(g, (n - i) / fadeOut);
        dst[i] = src[i] * g;
      }
    }
    await ensureEncoders();
    const mb = await loadMediabunny();
    const format = fmt === 'mp3' ? new mb.Mp3OutputFormat() : fmt === 'wav' ? new mb.WavOutputFormat() : new mb.Mp4OutputFormat({ fastStart: 'in-memory' });
    const output = new mb.Output({ format, target: new mb.BufferTarget() });
    const source = new mb.AudioBufferSource(fmt === 'wav' ? { codec: 'pcm-s16' } : { codec: fmt === 'mp3' ? 'mp3' : 'aac', bitrate: +el('ac-br').value });
    output.addAudioTrack(source);
    await output.start();
    await source.add(out);
    source.close();
    await output.finalize();
    const mime = fmt === 'mp3' ? 'audio/mpeg' : fmt === 'wav' ? 'audio/wav' : 'audio/mp4';
    result = { blob: new Blob([output.target.buffer!], { type: mime }), ext: fmt };
    setStatus(status, `Done: ${fmtTime(sel.b - sel.a)}, ${formatBytes(result.blob.size)}.`, 'ok');
    $('#ac-download').classList.remove('hidden');
  } catch (e) { setStatus(status, errorMessage(e), 'err'); }
  go.disabled = false;
});
$('#ac-download').addEventListener('click', () => result && file && downloadBlob(result.blob, `${baseName(file.name)}-cut.${result.ext}`));
