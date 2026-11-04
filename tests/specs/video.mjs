import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function ffprobe(p) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height:format=duration', '-of', 'json', p]).toString();
  return JSON.parse(out);
}

export default (test, { BASE, newPage, download, fixture, assert }) => {
  const waitDone = async (page) => {
    await page.waitForSelector('#vt-status.ok, #vt-status.warn, #vt-status.err', { timeout: 120000 });
    const msg = await page.textContent('#vt-status');
    assert(!(await page.$('#vt-status.err')), 'error: ' + msg);
    return msg;
  };

  test('compress-video: 720p -> 480p smaller mp4', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/compress-video`);
    await page.setInputFiles('#vt-drop input[type=file]', fixture('video.mp4'));
    await page.waitForFunction(() => document.querySelector('#vt-info').textContent.includes('×'), null, { timeout: 20000 });
    await page.selectOption('#vt-res', '480');
    await page.click('#vt-go');
    await waitDone(page);
    const d = await download(page, '#vt-download');
    const info = ffprobe(d.path);
    const v = info.streams.find((s) => s.codec_type === 'video');
    assert(v && v.height === 480, 'height ' + JSON.stringify(info.streams));
    assert(d.size < fs.statSync(fixture('video.mp4')).size, 'not smaller');
    assert(info.streams.some((s) => s.codec_type === 'audio'), 'audio missing');
  });

  test('compress-video: target size 1 MB', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/compress-video`);
    await page.setInputFiles('#vt-drop input[type=file]', fixture('video.mp4'));
    await page.waitForFunction(() => document.querySelector('#vt-info').textContent.includes('×'), null, { timeout: 20000 });
    await page.click('label:has(input[value=size]) span');
    await page.fill('#vt-mb', '1');
    await page.click('#vt-go');
    await waitDone(page);
    const d = await download(page, '#vt-download');
    assert(d.size <= 1024 * 1024 * 1.05, 'size ' + d.size);
  });

  test('trim-video: 2s to 5s', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/trim-video`);
    await page.setInputFiles('#vt-drop input[type=file]', fixture('video.mp4'));
    await page.waitForFunction(() => document.querySelector('#vt-end').value.length > 0, null, { timeout: 20000 });
    await page.fill('#vt-start', '0:02');
    await page.fill('#vt-end', '0:05');
    await page.dispatchEvent('#vt-end', 'change');
    await page.click('#vt-go');
    await waitDone(page);
    const d = await download(page, '#vt-download');
    const dur = +ffprobe(d.path).format.duration;
    assert(dur > 2.5 && dur < 3.6, 'duration ' + dur);
  });

  test('video-to-mp3: produces mp3', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/video-to-mp3`);
    await page.setInputFiles('#vt-drop input[type=file]', fixture('video.mp4'));
    await page.waitForFunction(() => document.querySelector('#vt-info').textContent.length > 5, null, { timeout: 20000 });
    await page.click('#vt-go');
    await waitDone(page);
    const d = await download(page, '#vt-download');
    const info = ffprobe(d.path);
    assert(d.name.endsWith('.mp3') && info.streams[0].codec_name === 'mp3', JSON.stringify(info));
    assert(Math.abs(+info.format.duration - 8) < 0.6, 'duration ' + info.format.duration);
  });

  test('mov-to-mp4: remux mov', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/mov-to-mp4`);
    await page.setInputFiles('#vt-drop input[type=file]', fixture('video.mov'));
    await page.waitForFunction(() => document.querySelector('#vt-info').textContent.includes('×'), null, { timeout: 20000 });
    await page.click('#vt-go');
    await waitDone(page);
    const d = await download(page, '#vt-download');
    const info = ffprobe(d.path);
    assert(d.name.endsWith('.mp4') && info.streams.some((s) => s.codec_name === 'h264'), JSON.stringify(info));
  });

  test('remove-audio-from-video: no audio stream', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/remove-audio-from-video`);
    await page.setInputFiles('#vt-drop input[type=file]', fixture('video.mp4'));
    await page.waitForFunction(() => document.querySelector('#vt-info').textContent.includes('×'), null, { timeout: 20000 });
    await page.click('#vt-go');
    await waitDone(page);
    const d = await download(page, '#vt-download');
    const info = ffprobe(d.path);
    assert(!info.streams.some((s) => s.codec_type === 'audio') && info.streams.some((s) => s.codec_type === 'video'), JSON.stringify(info));
  });

  test('screen-recorder: records 2 seconds', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/screen-recorder`);
    await page.uncheck('#sr-mic');
    await page.uncheck('#sr-system');
    await page.click('#sr-start');
    await page.waitForTimeout(2500);
    await page.click('#sr-stop');
    await page.waitForSelector('#sr-status.ok', { timeout: 10000 });
    const d = await download(page, '#sr-download');
    assert(d.size > 1000, 'empty recording ' + d.size);
  });
};
