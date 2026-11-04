import { h, formatBytes } from './ui';

/** A reorderable list of files (buttons + drag & drop + keyboard friendly). */
export class FileList {
  files: File[] = [];
  private thumbs = new Map<File, string>();
  constructor(private ul: HTMLElement, private onChange: () => void, private thumbFor?: (f: File) => Promise<string | null>) {}

  add(files: File[]) {
    this.files.push(...files);
    this.render();
    this.onChange();
  }
  clear() {
    this.thumbs.forEach((u) => URL.revokeObjectURL(u));
    this.thumbs.clear();
    this.files = [];
    this.render();
    this.onChange();
  }
  move(i: number, j: number) {
    if (j < 0 || j >= this.files.length) return;
    const [f] = this.files.splice(i, 1);
    this.files.splice(j, 0, f);
    this.render();
    this.onChange();
  }
  remove(i: number) {
    const [f] = this.files.splice(i, 1);
    const u = this.thumbs.get(f);
    if (u) URL.revokeObjectURL(u);
    this.thumbs.delete(f);
    this.render();
    this.onChange();
  }
  sortByName() {
    this.files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    this.render();
    this.onChange();
  }

  render() {
    this.ul.replaceChildren(
      ...this.files.map((f, i) => {
        const thumb = h('span', { class: 'thumb', text: f.type === 'application/pdf' ? '📄' : '🖼️' });
        const cached = this.thumbs.get(f);
        if (cached) thumb.replaceChildren(h('img', { src: cached, alt: '', class: 'thumb' }));
        else if (this.thumbFor) this.thumbFor(f).then((u) => { if (u) { this.thumbs.set(f, u); thumb.replaceChildren(h('img', { src: u, alt: '', class: 'thumb' })); } });
        const li = h('li', { class: 'file-item', draggable: 'true', 'data-i': i },
          h('span', { class: 'badge', text: String(i + 1) }),
          thumb,
          h('div', { class: 'meta' }, h('div', { class: 'name', text: f.name }), h('div', { class: 'size', text: formatBytes(f.size) })),
          h('div', { class: 'actions' },
            h('button', { class: 'icon-btn', type: 'button', text: '↑', title: 'Move up', 'aria-label': `Move ${f.name} up`, onclick: () => this.move(i, i - 1), disabled: i === 0 }),
            h('button', { class: 'icon-btn', type: 'button', text: '↓', title: 'Move down', 'aria-label': `Move ${f.name} down`, onclick: () => this.move(i, i + 1), disabled: i === this.files.length - 1 }),
            h('button', { class: 'icon-btn', type: 'button', text: '✕', title: 'Remove', 'aria-label': `Remove ${f.name}`, onclick: () => this.remove(i) })),
        );
        li.addEventListener('dragstart', (e) => { e.dataTransfer!.setData('text/plain', String(i)); li.classList.add('dragging'); });
        li.addEventListener('dragend', () => li.classList.remove('dragging'));
        li.addEventListener('dragover', (e) => { if (e.dataTransfer?.types.includes('text/plain')) { e.preventDefault(); e.stopPropagation(); } });
        li.addEventListener('drop', (e) => {
          const from = Number(e.dataTransfer?.getData('text/plain'));
          if (Number.isNaN(from) || !e.dataTransfer?.getData('text/plain')) return;
          e.preventDefault();
          e.stopPropagation();
          this.move(from, i);
        });
        return li;
      }),
    );
  }
}
