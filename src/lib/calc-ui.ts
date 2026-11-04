import { bindUrlState, shareOrCopy } from './ui';

/** Sync every SliderField's number box and range, wire URL state, and call `update` on change. */
export function initCalculator(update: () => void, extra: Record<string, HTMLInputElement | HTMLSelectElement> = {}) {
  const inputs: Record<string, HTMLInputElement | HTMLSelectElement> = { ...extra };
  document.querySelectorAll<HTMLElement>('.slider-field').forEach((f) => {
    const num = f.querySelector<HTMLInputElement>('[data-slider-num]')!;
    const range = f.querySelector<HTMLInputElement>('[data-slider-range]')!;
    range.addEventListener('input', () => { num.value = range.value; num.dispatchEvent(new Event('input')); });
    num.addEventListener('input', () => { range.value = num.value; });
    inputs[num.dataset.key || num.id] = num;
  });
  bindUrlState(inputs, update);
  document.querySelectorAll<HTMLElement>('[data-share]').forEach((b) =>
    b.addEventListener('click', async () => {
      const msg = await shareOrCopy(b.dataset.share || document.title);
      const old = b.textContent;
      b.textContent = msg;
      setTimeout(() => (b.textContent = old), 1800);
    }),
  );
  // Sync ranges with values that came from the URL.
  document.querySelectorAll<HTMLElement>('.slider-field').forEach((f) => {
    const num = f.querySelector<HTMLInputElement>('[data-slider-num]')!;
    f.querySelector<HTMLInputElement>('[data-slider-range]')!.value = num.value;
  });
}

export const val = (id: string) => {
  const e = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  const n = parseFloat(e?.value ?? '');
  return Number.isFinite(n) ? n : 0;
};
export const setText = (id: string, text: string) => { const e = document.getElementById(id); if (e) e.textContent = text; };
