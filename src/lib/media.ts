/**
 * Media conversion on top of Mediabunny (MPL-2.0) + the browser's WebCodecs.
 * Why not ffmpeg.wasm: it needs a 30 MB download, SharedArrayBuffer + COOP/COEP headers (which break ad iframes),
 * is 5-20x slower (no hardware encoding) and its x264 build is GPL. WebCodecs avoids all four problems.
 */
import type { ConversionVideoOptions, ConversionAudioOptions } from 'mediabunny';

export const loadMediabunny = () => import('mediabunny');

export function webCodecsSupported() {
  return typeof (window as any).VideoEncoder === 'function' && typeof (window as any).AudioEncoder === 'function';
}

let encodersReady: Promise<void> | null = null;
/** Register WASM fallbacks for codecs browsers usually can't encode (MP3 always; AAC on some Linux/Firefox). */
export function ensureEncoders() {
  encodersReady ??= (async () => {
    const mb = await loadMediabunny();
    if (!(await mb.canEncodeAudio('mp3'))) (await import('@mediabunny/mp3-encoder')).registerMp3Encoder();
    if (!(await mb.canEncodeAudio('aac'))) (await import('@mediabunny/aac-encoder')).registerAacEncoder();
  })();
  return encodersReady;
}

export interface MediaInfo {
  duration: number;
  width: number;
  height: number;
  hasVideo: boolean;
  hasAudio: boolean;
  videoCodec: string | null;
  audioCodec: string | null;
  format: string;
}

export async function probe(file: File): Promise<MediaInfo> {
  const mb = await loadMediabunny();
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  try {
    const [v, a] = await Promise.all([input.getPrimaryVideoTrack(), input.getPrimaryAudioTrack()]);
    const duration = await input.computeDuration();
    const fmt = await input.getFormat();
    return {
      duration,
      width: v?.displayWidth ?? 0,
      height: v?.displayHeight ?? 0,
      hasVideo: !!v,
      hasAudio: !!a,
      videoCodec: v?.codec ?? null,
      audioCodec: a?.codec ?? null,
      format: (fmt as any)?.name ?? '',
    };
  } finally {
    (input as any).dispose?.();
  }
}

export type Container = 'mp4' | 'webm' | 'mp3' | 'm4a' | 'wav';

export async function convert(
  file: File,
  opts: {
    container: Container;
    video?: ConversionVideoOptions;
    audio?: ConversionAudioOptions;
    trim?: { start?: number; end?: number };
    onProgress?: (p: number) => void;
    signal?: { cancel?: () => void };
  },
): Promise<{ blob: Blob; warnings: string[] }> {
  await ensureEncoders();
  const mb = await loadMediabunny();
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  const format =
    opts.container === 'mp4' ? new mb.Mp4OutputFormat({ fastStart: 'in-memory' }) :
    opts.container === 'm4a' ? new mb.Mp4OutputFormat({ fastStart: 'in-memory' }) :
    opts.container === 'webm' ? new mb.WebMOutputFormat() :
    opts.container === 'mp3' ? new mb.Mp3OutputFormat() :
    new mb.WavOutputFormat();
  const output = new mb.Output({ format, target: new mb.BufferTarget() });
  // Callers pass plain { bitrate } objects; Mediabunny wants Quality instances.
  const q = <T extends { quality?: any }>(o?: T): T | undefined =>
    o && o.quality && !(o.quality instanceof mb.Quality) ? { ...o, quality: new mb.Quality(o.quality) } : o;
  const conversion = await mb.Conversion.init({ input, output, video: q(opts.video), audio: q(opts.audio), trim: opts.trim, showWarnings: false });
  const warnings: string[] = [];
  for (const d of conversion.discardedTracks) {
    if (d.reason === 'discarded_by_user') continue;
    const kind = d.track.type === 'video' ? 'Video' : 'Audio';
    warnings.push(
      d.reason === 'undecodable_source_codec' ? `${kind} uses a codec your browser cannot decode (${(d.track as any).codec ?? 'unknown'}). Try Chrome or Edge, or Safari for iPhone (HEVC) videos.` :
      d.reason === 'no_encodable_target_codec' ? `${kind} could not be encoded in this browser. Try Chrome or Edge.` :
      `${kind} track skipped (${d.reason}).`,
    );
  }
  if (!conversion.isValid) {
    throw new Error(warnings[0] || 'This file cannot be converted in this browser.');
  }
  if (opts.signal) opts.signal.cancel = () => conversion.cancel();
  conversion.onProgress = (p) => opts.onProgress?.(p);
  await conversion.execute();
  const buf = (output.target as InstanceType<typeof mb.BufferTarget>).buffer!;
  const mime = opts.container === 'mp4' ? 'video/mp4' : opts.container === 'm4a' ? 'audio/mp4' : opts.container === 'webm' ? 'video/webm' : opts.container === 'mp3' ? 'audio/mpeg' : 'audio/wav';
  return { blob: new Blob([buf], { type: mime }), warnings };
}

/** Pick the most compatible video codec the browser can encode at this size. */
export async function pickVideoCodec(container: Container, width: number, height: number) {
  const mb = await loadMediabunny();
  const order = container === 'webm' ? (['vp9', 'vp8', 'av1'] as const) : (['avc', 'hevc', 'vp9', 'av1'] as const);
  return mb.getFirstEncodableVideoCodec([...order], { width, height });
}

export function fmtTime(s: number): string {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60), sec = s - m * 60;
  const hh = Math.floor(m / 60);
  const mm = hh ? String(m % 60).padStart(2, '0') : String(m);
  return `${hh ? hh + ':' : ''}${mm}:${sec.toFixed(1).padStart(4, '0')}`;
}

export function parseTime(t: string): number | null {
  const parts = t.trim().split(':').map(Number);
  if (!parts.length || parts.some((x) => Number.isNaN(x))) return null;
  return parts.reduce((acc, v) => acc * 60 + v, 0);
}

/** Keep dimensions even (required by H.264) and within the original size. */
export function evenSize(w: number, h: number, shortSide: number) {
  const s = Math.min(1, shortSide / Math.min(w, h));
  const ew = Math.max(2, Math.round((w * s) / 2) * 2);
  const eh = Math.max(2, Math.round((h * s) / 2) * 2);
  return { width: ew, height: eh };
}
