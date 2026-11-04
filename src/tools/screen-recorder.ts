import { $, downloadBlob, setStatus, formatBytes, track } from '../lib/ui';

const startBtn = $<HTMLButtonElement>('#sr-start');
const pauseBtn = $<HTMLButtonElement>('#sr-pause');
const stopBtn = $<HTMLButtonElement>('#sr-stop');
const status = $('#sr-status');
const timer = $('#sr-timer');
const preview = $<HTMLVideoElement>('#sr-preview');
const result = $('#sr-result');
let rec: MediaRecorder | null = null;
let streams: MediaStream[] = [];
let chunks: Blob[] = [];
let started = 0, pausedTotal = 0, pausedAt = 0, tick: number | undefined;
let audioCtx: AudioContext | null = null;
let output: { blob: Blob; ext: string } | null = null;

const supported = !!navigator.mediaDevices?.getDisplayMedia && typeof MediaRecorder !== 'undefined';
if (!supported) {
  setStatus(status, 'Screen recording is not supported in this browser. Use Chrome, Edge or Firefox on a desktop or laptop.', 'warn');
  startBtn.disabled = true;
}

function pickMime(): { mime: string; ext: string } {
  const prefs: [string, string][] = [
    ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'],
    ['video/mp4', 'mp4'],
    ['video/webm;codecs=vp9,opus', 'webm'],
    ['video/webm;codecs=vp8,opus', 'webm'],
    ['video/webm', 'webm'],
  ];
  for (const [m, e] of prefs) if (MediaRecorder.isTypeSupported(m)) return { mime: m, ext: e };
  return { mime: '', ext: 'webm' };
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

async function start() {
  try {
    const wantSystem = ($<HTMLInputElement>('#sr-system')).checked;
    const wantMic = ($<HTMLInputElement>('#sr-mic')).checked;
    const fps = +($<HTMLSelectElement>('#sr-fps')).value;
    const screen = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: fps }, audio: wantSystem } as any);
    streams = [screen];
    const tracks: MediaStreamTrack[] = [...screen.getVideoTracks()];
    const audioSources: MediaStream[] = [];
    if (screen.getAudioTracks().length) audioSources.push(screen);
    if (wantMic) {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        streams.push(mic);
        audioSources.push(mic);
      } catch { setStatus(status, 'Microphone permission denied: recording without mic.', 'warn'); }
    }
    if (audioSources.length === 1) tracks.push(...audioSources[0].getAudioTracks());
    else if (audioSources.length > 1) {
      audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      audioSources.forEach((s) => audioCtx!.createMediaStreamSource(s).connect(dest));
      tracks.push(...dest.stream.getAudioTracks());
    }
    const { mime, ext } = pickMime();
    rec = new MediaRecorder(new MediaStream(tracks), { mimeType: mime || undefined, videoBitsPerSecond: +($<HTMLSelectElement>('#sr-quality')).value });
    chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => finish(ext, rec!.mimeType || mime || 'video/webm');
    screen.getVideoTracks()[0].addEventListener('ended', stop); // user pressed "Stop sharing"
    rec.start(1000);
    started = Date.now(); pausedTotal = 0;
    tick = window.setInterval(() => { if (rec?.state === 'recording') timer.textContent = fmt(Date.now() - started - pausedTotal); }, 250);
    startBtn.disabled = true; pauseBtn.disabled = false; stopBtn.disabled = false;
    result.classList.add('hidden');
    setStatus(status, '● Recording… Press Stop (or "Stop sharing" in your browser) when finished.', 'err');
    track('screen_record_start');
  } catch (e: any) {
    if (e?.name !== 'NotAllowedError') setStatus(status, `Could not start recording: ${e?.message || e}`, 'err');
    cleanup();
  }
}

function stop() {
  if (rec && rec.state !== 'inactive') rec.stop();
}

function cleanup() {
  streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
  streams = [];
  audioCtx?.close().catch(() => {});
  audioCtx = null;
  clearInterval(tick);
  startBtn.disabled = !supported; pauseBtn.disabled = true; stopBtn.disabled = true;
  pauseBtn.textContent = '⏸ Pause';
}

function finish(ext: string, type: string) {
  cleanup();
  const blob = new Blob(chunks, { type: type.split(';')[0] });
  output = { blob, ext };
  if (preview.src) URL.revokeObjectURL(preview.src);
  preview.src = URL.createObjectURL(blob);
  result.classList.remove('hidden');
  $('#sr-meta').textContent = `${fmt(Date.now() - started - pausedTotal)} · ${formatBytes(blob.size)} · ${ext.toUpperCase()}`;
  $('#sr-webm-tip').classList.toggle('hidden', ext !== 'webm');
  setStatus(status, 'Recording finished. Preview it below and download.', 'ok');
}

startBtn.addEventListener('click', start);
stopBtn.addEventListener('click', stop);
pauseBtn.addEventListener('click', () => {
  if (!rec) return;
  if (rec.state === 'recording') { rec.pause(); pausedAt = Date.now(); pauseBtn.textContent = '▶ Resume'; setStatus(status, 'Paused.', 'warn'); }
  else if (rec.state === 'paused') { rec.resume(); pausedTotal += Date.now() - pausedAt; pauseBtn.textContent = '⏸ Pause'; setStatus(status, '● Recording…', 'err'); }
});
$('#sr-download').addEventListener('click', () => {
  if (!output) return;
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  downloadBlob(output.blob, `screen-recording-${stamp}.${output.ext}`);
});
addEventListener('beforeunload', (e) => { if (rec && rec.state !== 'inactive') { e.preventDefault(); } });
