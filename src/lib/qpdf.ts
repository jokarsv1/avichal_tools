/** Thin client for public/workers/qpdf.js (qpdf compiled to WebAssembly, Apache-2.0). */
export interface QpdfResult { code: number; stdout: string; stderr: string; output: Uint8Array | null }

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (r: QpdfResult) => void>();

function getWorker() {
  if (!worker) {
    worker = new Worker('/workers/qpdf.js');
    worker.onmessage = (e) => { const r = e.data; pending.get(r.id)?.(r); pending.delete(r.id); };
  }
  return worker;
}

/** Run qpdf with the given arguments. Use "/in.pdf" for the input and "/out.pdf" for the output. */
export function qpdf(args: string[], input: Uint8Array): Promise<QpdfResult> {
  const id = ++seq;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    getWorker().postMessage({ id, args, input });
  });
}

export type LockState = 'none' | 'restrictions' | 'password';
/** 'none' = not encrypted, 'restrictions' = encrypted but opens without a password (print/copy limits), 'password' = needs a password. */
export async function lockState(input: Uint8Array): Promise<LockState> {
  const r = await qpdf(['--requires-password', '/in.pdf'], input);
  // qpdf exit codes for --requires-password: 0 = password required, 2 = not encrypted, 3 = encrypted, no password needed.
  // qpdf 11.0 reports a password-protected file as an "invalid password" error (exit 2) instead of 0.
  if (r.code === 0 || /invalid password/i.test(r.stderr)) return 'password';
  if (r.code === 3) return 'restrictions';
  if (r.code === 2 && /not encrypted|is not encrypted/i.test(r.stdout + r.stderr)) return 'none';
  if (r.code === 2 && r.stderr.trim() && !/not encrypted/i.test(r.stderr)) throw new Error(r.stderr.replace(/^.*?in\.pdf:\s*/m, '').trim() || 'This file could not be read as a PDF.');
  return 'none';
}

export async function decrypt(input: Uint8Array, password = ''): Promise<Uint8Array> {
  const args = ['--decrypt', ...(password ? [`--password=${password}`] : []), '/in.pdf', '/out.pdf'];
  const r = await qpdf(args, input);
  if ((r.code === 0 || r.code === 3) && r.output) return r.output;
  if (/invalid password/i.test(r.stderr)) throw new Error('WRONG_PASSWORD');
  throw new Error(r.stderr.replace(/^.*?in\.pdf:\s*/m, '').trim() || 'Could not unlock this PDF.');
}

export async function encrypt(input: Uint8Array, o: { user: string; owner?: string; print: boolean; copy: boolean; edit: boolean }): Promise<Uint8Array> {
  const owner = o.owner || Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('');
  const args = ['/in.pdf', '--encrypt', o.user, owner, '256', `--print=${o.print ? 'full' : 'none'}`, `--extract=${o.copy ? 'y' : 'n'}`, `--modify=${o.edit ? 'all' : 'none'}`, '--', '/out.pdf'];
  const r = await qpdf(args, input);
  if ((r.code === 0 || r.code === 3) && r.output) return r.output;
  throw new Error(r.stderr.replace(/^.*?in\.pdf:\s*/m, '').trim() || 'Could not protect this PDF.');
}
