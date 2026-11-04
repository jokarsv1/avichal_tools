import { $, onFiles, downloadBlob, setStatus, setProgress, errorMessage, baseName, formatBytes } from '../lib/ui';
import { loadMediabunny, probe, fmtTime, parseTime } from '../lib/media';

const video = $<HTMLVideoElement>('#gf-video');
const status = $('#gf-status');
const bar = $('#gf-progress');
const go = $<HTMLButtonElement>('#gf-go');
const out = $<HTMLImageElement>('#gf-out');
const el = (id: string) => document.getElementById(id) as HTMLInputElement;
let file: File | null = null;
let duration = 0;
let result: Blob | null = null;

onFiles($('#gf-drop'), async ([f]) => {
  file = f;
  if (video.src) URL.revokeObjectURL(video.src);
  video.src = URL.createObjectURL(f);
  $('#gf-panel').classList.remove('hidden');
  $('#gf-drop').classList.add('compact');
  try {
    const info = await probe(f);
    duration = info.duration;
    el('gf-start').value = fmtTime(0);
    el('gf-end').value = fmtTime(Math.min(duration, 5));
    $('#gf-info').textContent = `${f.name} · ${fmtTime(duration)} · ${info.width}×${info.height}`;
  } catch { setStatus(status, 'This video could not be read.', 'err'); }
});
$('#gf-set-start').addEventListener('click', () => (el('gf-start').value = fmtTime(video.currentTime)));
$('#gf-set-end').addEventListener('click', () => (el('gf-end').value = fmtTime(video.currentTime)));

go.addEventListener('click', async () => {
  if (!file) return;
  const start = parseTime(el('gf-start').value) ?? 0;
  const end = Math.min(duration, parseTime(el('gf-end').value) ?? start + 5);
  if (end <= start) return setStatus(status, 'End must be after start.', 'warn');
  if (end - start > 30) return setStatus(status, 'GIFs longer than 30 seconds get huge. Please choose a shorter clip.', 'warn');
  const fps = +el('gf-fps').value, width = +el('gf-width').value;
  go.disabled = true;
  try {
    const mb = await loadMediabunny();
    const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('No video track found.');
    if (!(await track.canDecode())) throw new Error('Your browser cannot decode this video. Try Chrome, Edge or Safari.');
    const w = Math.min(width, track.displayWidth);
    const h = Math.round((track.displayHeight * w) / track.displayWidth / 2) * 2;
    const sink = new mb.CanvasSink(track, { width: w, height: h, fit: 'fill', poolSize: 2 });
    const times: number[] = [];
    for (let t = start; t < end; t += 1 / fps) times.push(t);
    const gif = GIFEncoder();
    const delay = Math.round(1000 / fps);
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const ctx = tmp.getContext('2d', { willReadFrequently: true })!;
    let i = 0;
    for await (const frame of sink.canvasesAtTimestamps(times)) {
      i++;
      if (!frame) continue;
      ctx.drawImage(frame.canvas as CanvasImageSource, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      const palette = quantize(data, 256);
      gif.writeFrame(applyPalette(data, palette), w, h, { palette, delay, repeat: el('gf-loop').checked ? 0 : -1 });
      setProgress(bar, i / times.length);
      status.textContent = `Encoding frame ${i} of ${times.length}…`;
    }
    gif.finish();
    result = new Blob([gif.bytes() as BlobPart], { type: 'image/gif' });
    if (out.src) URL.revokeObjectURL(out.src);
    out.src = URL.createObjectURL(result);
    $('#gf-result').classList.remove('hidden');
    setStatus(status, `GIF ready: ${w}×${h}, ${times.length} frames, ${formatBytes(result.size)}.`, 'ok');
  } catch (e) { setStatus(status, errorMessage(e), 'err'); }
  bar.classList.add('hidden');
  go.disabled = false;
});
$('#gf-download').addEventListener('click', () => result && file && downloadBlob(result, `${baseName(file.name)}.gif`));
