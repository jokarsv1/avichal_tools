import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const dims = (p) => { const o = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'json', p]).toString()); return [o.streams[0].width, o.streams[0].height]; };

export default (test, { BASE, newPage, download, fixture, assert }) => {
  test('passport-photo-maker: 35x45 single + 8 on 4x6 sheet', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/passport-photo-maker`);
    await page.setInputFiles('#pp-drop input[type=file]', fixture('photo.jpg'));
    await page.waitForSelector('#pp-panel:not(.hidden)');
    const one = await download(page, '#pp-dl-one');
    const [w, h] = dims(one.path);
    assert(w === 413 && h === 531, `single ${w}x${h}`);
    const b = fs.readFileSync(one.path);
    assert(b.readUInt16BE(14) === 300, 'dpi');
    const sheet = await download(page, '#pp-dl-sheet');
    const [sw, sh] = dims(sheet.path);
    assert(sw === 1800 && sh === 1200, `sheet ${sw}x${sh}`);
    assert(/-8\.jpg$/.test(sheet.name), 'expected 8 photos: ' + sheet.name);
    const pdf = await download(page, '#pp-dl-pdf');
    assert(pdf.name.endsWith('.pdf'), pdf.name);
    assert(page.errors.length === 0, page.errors.join('\n'));
  });
};
