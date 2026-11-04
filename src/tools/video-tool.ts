import { $, $$, onFiles, downloadBlob, setStatus, setProgress, errorMessage, baseName, formatBytes, track } from '../lib/ui';
import { probe, convert, pickVideoCodec, fmtTime, parseTime, evenSize, webCodecsSupported, type MediaInfo, type Container } from '../lib/media';

const root = $('[data-video]');
const mode = root.dataset.mode as 'compress' | 'trim' | 'audio' | 'convert' | 'mute';
const video = $<HTMLVideoElement>('#vt-video');
const status = $('#vt-status');
const bar = $('#vt-progress');
const go = $<HTMLButtonElement>('#vt-go');
const cancelBtn = $<HTMLButtonElement>('#vt-cancel');
const el = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T | null;
let file: File | null = null;
let info: MediaInfo | null = null;
let result: { blob: Blob; name: string } | null = null;
let cancel: { cancel?: () => void } = {};

if (!webCodecsSupported()) $('#vt-unsupported').classList.remove('hidden');

onFiles($('#vt-drop'), async ([f]) => {
  file = f;
  result = null;
  $('#vt-result').classList.add('hidden');
  if (video.src) URL.revokeObjectURL(video.src);
  video.src = URL.createObjectURL(f);
  $('#vt-panel').classList.remove('hidden');
  $('#vt-drop').classList.add('compact');
  setStatus(status, 'Reading video…', 'info');
  try {
    info = await probe(f);
    $('#vt-info').textContent = [
      f.name, formatBytes(f.size), fmtTime(info.duration),
      info.hasVideo ? `${info.width}×${info.height}` : 'audio only',
      [info.videoCodec, info.audioCodec].filter(Boolean).join(' + '),
    ].filter(Boolean).join(' · ');
    if (mode === 'trim') {
      el('vt-end')!.value = fmtTime(info.duration);
      syncTrim();
    }
    status.textContent = '';
    status.className = 'status';
  } catch (e) {
    setStatus(status, 'This file could not be read. Supported: MP4, MOV, MKV, WebM, MP3, M4A, WAV, OGG.', 'err');
  }
});

// ---------- compress options ----------
if (mode === 'compress') {
  $$<HTMLInputElement>('input[name=vt-by]').forEach((r) => r.addEventListener('change', () => {
    const bySize = document.querySelector<HTMLInputElement>('input[name=vt-by]:checked')!.value === 'size';
    $('#vt-size-field').classList.toggle('hidden', !bySize);
    $('#vt-quality-field').classList.toggle('hidden', bySize);
  }));
  $$<HTMLButtonElement>('[data-mb]').forEach((b) => b.addEventListener('click', () => (el('vt-mb')!.value = b.dataset.mb!)));
}

// ---------- trim UI ----------
function syncTrim(from?: 'range') {
  if (!info) return;
  const d = info.duration;
  const rs = el('vt-r-start')!, re = el('vt-r-end')!;
  if (from === 'range') {
    el('vt-start')!.value = fmtTime((+rs.value / 1000) * d);
    el('vt-end')!.value = fmtTime((+re.value / 1000) * d);
  } else {
    rs.value = String(Math.round(((parseTime(el('vt-start')!.value) ?? 0) / d) * 1000));
    re.value = String(Math.round(((parseTime(el('vt-end')!.value) ?? d) / d) * 1000));
  }
  const s = parseTime(el('vt-start')!.value) ?? 0, e = parseTime(el('vt-end')!.value) ?? d;
  $('#vt-len').textContent = e > s ? `New length: ${fmtTime(e - s)} (removing ${fmtTime(d - (e - s))})` : 'End must be after start.';
}
if (mode === 'trim') {
  el('vt-r-start')!.addEventListener('input', () => { syncTrim('range'); video.currentTime = parseTime(el('vt-start')!.value) ?? 0; });
  el('vt-r-end')!.addEventListener('input', () => { syncTrim('range'); video.currentTime = parseTime(el('vt-end')!.value) ?? 0; });
  el('vt-start')!.addEventListener('change', () => syncTrim());
  el('vt-end')!.addEventListener('change', () => syncTrim());
  el('vt-set-start')!.addEventListener('click', () => { el('vt-start')!.value = fmtTime(video.currentTime); syncTrim(); });
  el('vt-set-end')!.addEventListener('click', () => { el('vt-end')!.value = fmtTime(video.currentTime); syncTrim(); });
}

cancelBtn.addEventListener('click', () => cancel.cancel?.());

go.addEventListener('click', async () => {
  if (!file || !info) return;
  go.disabled = true;
  cancelBtn.classList.remove('hidden');
  $('#vt-result').classList.add('hidden');
  setProgress(bar, 0);
  const started = performance.now();
  cancel = {};
  try {
    let container: Container = 'mp4';
    let ext = 'mp4';
    let suffix = '';
    const opts: Parameters<typeof convert>[1] = { container, onProgress: (p) => { setProgress(bar, p); status.textContent = `Working… ${Math.round(p * 100)}%`; }, signal: cancel };
    const isWebm = /webm|matroska|mkv/i.test(info.format + file.name);

    if (mode === 'compress') {
      const bySize = document.querySelector<HTMLInputElement>('input[name=vt-by]:checked')!.value === 'size';
      const res = +el<HTMLSelectElement>('vt-res')!.value;
      const noAudio = el('vt-noaudio')!.checked;
      const { width, height } = res && Math.min(info.width, info.height) > res ? evenSize(info.width, info.height, res) : evenSize(info.width, info.height, Math.min(info.width, info.height));
      const codec = await pickVideoCodec('mp4', width, height);
      if (!codec) throw new Error('Your browser cannot encode video. Please use the latest Chrome or Edge.');
      const sourceBps = (file.size * 8) / Math.max(1, info.duration);
      const audioBps = noAudio ? 0 : 96_000;
      let videoBps: number;
      if (bySize) {
        const mb = Math.max(1, +el('vt-mb')!.value || 25);
        videoBps = (mb * 1024 * 1024 * 8 * 0.94) / Math.max(1, info.duration) - audioBps;
        if (videoBps < 80_000) throw new Error(`${mb} MB is too small for a ${fmtTime(info.duration)} video. Try a larger size or trim it first.`);
      } else {
        const bpp = +el<HTMLSelectElement>('vt-quality')!.value;
        videoBps = Math.min(width * height * 30 * bpp, sourceBps * 0.8);
      }
      videoBps = Math.max(120_000, Math.round(videoBps));
      opts.video = { width, height, fit: 'contain', codec, quality: { bitrate: videoBps }, forceTranscode: true };
      opts.audio = noAudio ? { discard: true } : { codec: 'aac', quality: { bitrate: audioBps }, numberOfChannels: 2 };
      suffix = '-compressed';
    } else if (mode === 'trim') {
      const s = parseTime(el('vt-start')!.value) ?? 0, e = parseTime(el('vt-end')!.value) ?? info.duration;
      if (e <= s) throw new Error('End must be after start.');
      opts.trim = { start: Math.max(0, s), end: Math.min(info.duration, e) };
      if (isWebm) { container = 'webm'; ext = 'webm'; }
      suffix = '-trimmed';
    } else if (mode === 'audio') {
      const f = el<HTMLSelectElement>('vt-afmt')!.value as 'mp3' | 'm4a' | 'wav';
      container = f; ext = f;
      opts.video = { discard: true };
      opts.audio = f === 'wav' ? { codec: 'pcm-s16' } : { codec: f === 'mp3' ? 'mp3' : 'aac', quality: { bitrate: +el<HTMLSelectElement>('vt-abr')!.value } };
      if (!info.hasAudio) throw new Error('This video has no audio track.');
    } else if (mode === 'convert') {
      container = el<HTMLSelectElement>('vt-cfmt')!.value as Container;
      ext = container;
      if (container === 'mp4') {
        const canCopyVideo = info.videoCodec === 'avc' || info.videoCodec === 'hevc';
        if (!canCopyVideo && info.hasVideo) {
          const codec = await pickVideoCodec('mp4', info.width, info.height);
          if (!codec) throw new Error('Your browser cannot encode video. Please use the latest Chrome or Edge.');
          opts.video = { codec };
        }
        opts.audio = info.audioCodec === 'aac' || info.audioCodec === 'mp3' ? {} : { codec: 'aac' };
      } else {
        opts.video = { codec: (await pickVideoCodec('webm', info.width, info.height)) ?? 'vp9' };
        opts.audio = { codec: 'opus' };
      }
    } else if (mode === 'mute') {
      opts.audio = { discard: true };
      if (isWebm) { container = 'webm'; ext = 'webm'; }
      suffix = '-muted';
    }
    opts.container = container;
    const { blob, warnings } = await convert(file, opts);
    result = { blob, name: `${baseName(file.name)}${suffix}.${ext}` };
    const secs = ((performance.now() - started) / 1000).toFixed(1);
    $('#vt-before').textContent = formatBytes(file.size);
    $('#vt-after').textContent = formatBytes(blob.size);
    const pct = Math.round((1 - blob.size / file.size) * 100);
    $('#vt-saved').textContent = pct >= 0 ? `−${pct}%` : `+${-pct}%`;
    $('#vt-result').classList.remove('hidden');
    setStatus(status, `Done in ${secs}s.${warnings.length ? ' ' + warnings.join(' ') : ''}`, warnings.length ? 'warn' : 'ok');
    track('video_done', { mode, secs: +secs });
  } catch (e: any) {
    const msg = /cancel/i.test(String(e?.message)) ? 'Cancelled.' : errorMessage(e);
    setStatus(status, msg, /Cancelled/.test(msg) ? 'info' : 'err');
  } finally {
    go.disabled = false;
    cancelBtn.classList.add('hidden');
    bar.classList.add('hidden');
  }
});

$('#vt-download').addEventListener('click', () => result && downloadBlob(result.blob, result.name));
