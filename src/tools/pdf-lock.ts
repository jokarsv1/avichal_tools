import { $, onFiles, downloadBlob, setStatus, baseName, formatBytes, track } from '../lib/ui';
import { lockState, decrypt, encrypt, type LockState } from '../lib/qpdf';

const root = $('#pl');
const status = $('#pl-status');
const dl = $<HTMLButtonElement>('#pl-download');
const pw = $<HTMLInputElement>('#pl-pw');
const unlockGo = $<HTMLButtonElement>('#pl-unlock-go');
const protectGo = $<HTMLButtonElement>('#pl-protect-go');
const pw1 = $<HTMLInputElement>('#pl-new');
const pw2 = $<HTMLInputElement>('#pl-new2');
let file: File | null = null;
let bytes: Uint8Array | null = null;
let state: LockState = 'none';
let result: { blob: Blob; name: string } | null = null;

const mode = () => (document.querySelector<HTMLInputElement>('input[name=pl-mode]:checked')?.value || 'unlock') as 'unlock' | 'protect';

function sync() {
  const m = mode();
  $('#pl-unlock').classList.toggle('hidden', !file || m !== 'unlock');
  $('#pl-protect').classList.toggle('hidden', !file || m !== 'protect');
  $('#pl-pw-wrap').classList.toggle('hidden', state !== 'password');
  unlockGo.disabled = !file || state === 'none' || (state === 'password' && !pw.value);
  protectGo.disabled = !file || !pw1.value || pw1.value !== pw2.value;
  if (m === 'protect' && pw1.value && pw2.value && pw1.value !== pw2.value) setStatus(status, 'The two passwords do not match.', 'warn');
}

document.querySelectorAll<HTMLInputElement>('input[name=pl-mode]').forEach((r) => r.addEventListener('change', () => { result = null; dl.classList.add('hidden'); describe(); sync(); }));
[pw, pw1, pw2].forEach((el) => el.addEventListener('input', sync));
pw.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !unlockGo.disabled) unlockGo.click(); });
$('#pl-eye').addEventListener('click', () => { pw.type = pw.type === 'password' ? 'text' : 'password'; });
$('#pl-a-use').addEventListener('click', () => {
  const name = $<HTMLInputElement>('#pl-a-name').value.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase();
  const year = $<HTMLInputElement>('#pl-a-year').value.trim();
  if (name.length < 1 || !/^\d{4}$/.test(year)) { setStatus(status, 'Enter your name and 4-digit birth year.', 'warn'); return; }
  pw.value = name + year;
  pw.type = 'text';
  track('aadhaar_helper_used');
  sync();
  unlockGo.click();
});

function describe() {
  if (!file) return;
  const m = mode();
  if (m === 'unlock') {
    if (state === 'none') setStatus(status, 'ℹ️ This PDF has no password or restrictions, so there is nothing to remove. Want to add one? Choose "Add password".', 'info');
    else if (state === 'restrictions') setStatus(status, '🔏 This PDF opens without a password but blocks printing, copying or editing. Press Unlock to remove the restrictions.', 'info');
    else setStatus(status, '🔑 This PDF needs a password to open. Enter it below; it never leaves your device.', 'info');
  } else {
    setStatus(status, state === 'none' ? 'Choose a password and press Protect.' : 'This PDF is already protected. Remove the old password first, or protect it again with a new one after unlocking.', state === 'none' ? 'info' : 'warn');
  }
}

onFiles($('#pl-drop'), async (files) => {
  file = files[0];
  result = null; dl.classList.add('hidden'); pw.value = '';
  $('#pl-file').textContent = `${file.name} · ${formatBytes(file.size)}`;
  setStatus(status, 'Checking the PDF…', 'info');
  bytes = new Uint8Array(await file.arrayBuffer());
  try { state = await lockState(bytes); } catch (e) { file = null; setStatus(status, `❌ ${(e as Error).message}`, 'err'); sync(); return; }
  // Auto-switch to the action that makes sense for this file.
  const want = state === 'none' ? 'protect' : 'unlock';
  if (mode() !== want && !(root.dataset.mode === 'protect' && state === 'none')) {
    const r = document.querySelector<HTMLInputElement>(`input[name=pl-mode][value=${want}]`);
    if (r) r.checked = true;
  }
  describe();
  sync();
  if (state === 'password') pw.focus();
});

unlockGo.addEventListener('click', async () => {
  if (!file || !bytes) return;
  unlockGo.disabled = true;
  setStatus(status, 'Unlocking…', 'info');
  try {
    const out = await decrypt(bytes.slice(), state === 'password' ? pw.value : '');
    result = { blob: new Blob([out], { type: 'application/pdf' }), name: `${baseName(file.name)}-unlocked.pdf` };
    setStatus(status, `✅ Unlocked. The new PDF opens without a password and has no print or copy restrictions (${formatBytes(out.length)}).`, 'ok');
    dl.classList.remove('hidden');
    dl.focus();
  } catch (e) {
    const msg = (e as Error).message;
    setStatus(status, msg === 'WRONG_PASSWORD' ? '❌ That password is not correct. Check capital letters, or try the helpers below.' : `❌ ${msg}`, 'err');
  }
  sync();
});

protectGo.addEventListener('click', async () => {
  if (!file || !bytes) return;
  protectGo.disabled = true;
  setStatus(status, 'Encrypting with AES-256…', 'info');
  try {
    const out = await encrypt(bytes.slice(), { user: pw1.value, print: $<HTMLInputElement>('#pl-print').checked, copy: $<HTMLInputElement>('#pl-copy').checked, edit: $<HTMLInputElement>('#pl-edit').checked });
    result = { blob: new Blob([out], { type: 'application/pdf' }), name: `${baseName(file.name)}-protected.pdf` };
    setStatus(status, '✅ Protected. Anyone opening this PDF now needs the password. Keep it somewhere safe.', 'ok');
    dl.classList.remove('hidden');
    dl.focus();
  } catch (e) {
    setStatus(status, `❌ ${(e as Error).message}`, 'err');
  }
  sync();
});

dl.addEventListener('click', () => { if (result) downloadBlob(result.blob, result.name); });
sync();
