import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const probe = (p) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,codec_type,width,height,nb_frames:format=duration', '-of', 'json', p]).toString());

export default (test, { BASE, newPage, download, fixture, assert }) => {
  test('video-to-gif: 2 s clip at 10 fps', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/video-to-gif`);
    await page.setInputFiles('#gf-drop input[type=file]', fixture('video.mp4'));
    await page.waitForFunction(() => document.querySelector('#gf-info').textContent.includes('×'), null, { timeout: 20000 });
    await page.fill('#gf-start', '0:01');
    await page.fill('#gf-end', '0:03');
    await page.selectOption('#gf-width', '320');
    await page.click('#gf-go');
    await page.waitForSelector('#gf-status.ok, #gf-status.err', { timeout: 60000 });
    assert(!(await page.$('#gf-status.err')), await page.textContent('#gf-status'));
    const d = await download(page, '#gf-download');
    const info = probe(d.path);
    assert(info.streams[0].codec_name === 'gif' && info.streams[0].width === 320, JSON.stringify(info));
    assert(fs.readFileSync(d.path).toString('latin1', 0, 6).startsWith('GIF8'), 'not a gif');
  });

  test('audio-cutter: cut 5 s mp3 with fade', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/audio-cutter`);
    await page.setInputFiles('#ac-drop input[type=file]', fixture('song.mp3'));
    await page.waitForSelector('#ac-panel:not(.hidden)', { timeout: 20000 });
    await page.fill('#ac-start', '0:02');
    await page.fill('#ac-end', '0:07');
    await page.dispatchEvent('#ac-end', 'change');
    await page.click('#ac-go');
    await page.waitForSelector('#ac-status.ok, #ac-status.err', { timeout: 60000 });
    assert(!(await page.$('#ac-status.err')), await page.textContent('#ac-status'));
    const d = await download(page, '#ac-download');
    const info = probe(d.path);
    assert(info.streams[0].codec_name === 'mp3', JSON.stringify(info));
    const dur = +info.format.duration;
    assert(dur > 4.6 && dur < 5.5, 'duration ' + dur);
  });
};
