import fs from 'node:fs';

const GIF1 = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const URL1 = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=Tr4ck';

/** Stand in for YouTube's image server (the test machine has no internet). */
async function stubThumbs(page, photo) {
  await page.context().route('https://i.ytimg.com/**', (route) => {
    const url = route.request().url();
    // A missing size: YouTube answers with a tiny placeholder.
    if (url.includes('maxresdefault')) return route.fulfill({ status: 404, contentType: 'image/gif', body: GIF1, headers: { 'access-control-allow-origin': '*' } });
    return route.fulfill({ status: 200, contentType: 'image/jpeg', body: photo, headers: { 'access-control-allow-origin': '*' } });
  });
}

/** Width × height of a JPEG/PNG file, measured in the page. */
async function dims(page, file) {
  const b64 = fs.readFileSync(file).toString('base64');
  return page.evaluate(async (src) => { const i = new Image(); i.src = src; await i.decode(); return `${i.naturalWidth}x${i.naturalHeight}`; }, `data:image/jpeg;base64,${b64}`);
}

export default (test, { BASE, newPage, download, fixture, assert }) => {
  test('youtube thumbnail downloader: all sizes, missing HD flagged, download', async () => {
    const page = await newPage();
    await stubThumbs(page, fs.readFileSync(fixture('photo.jpg')));
    await page.goto(`${BASE}/youtube-thumbnail-downloader`);
    await page.fill('#yt-url', 'not a link');
    await page.waitForFunction(() => document.querySelector('#yt-status').classList.contains('err'));
    await page.fill('#yt-url', URL1);
    await page.waitForFunction(() => document.querySelectorAll('.yt-thumb').length === 5);
    await page.waitForSelector('.yt-thumb.missing');
    assert((await page.$$('.yt-thumb.missing')).length === 1, 'only HD missing');
    assert((await page.textContent('#yt-status')).includes('dQw4w9WgXcQ'), 'video id shown');
    const d = await download(page, '.yt-thumb:nth-child(2) .btn-primary');
    assert(d.name === 'youtube-thumbnail-dQw4w9WgXcQ-640x480.jpg' && d.size > 1000, JSON.stringify(d));
    // Shorts links work too.
    await page.fill('#yt-url', 'https://youtube.com/shorts/dQw4w9WgXcQ?feature=share');
    await page.waitForFunction(() => document.querySelector('#yt-status').textContent.includes('Short'));
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('youtube thumbnail downloader: falls back to opening the image when the browser blocks the download', async () => {
    const page = await newPage();
    await stubThumbs(page, fs.readFileSync(fixture('photo.jpg')));
    await page.goto(`${BASE}/youtube-thumbnail-downloader`);
    await page.fill('#yt-url', URL1);
    await page.waitForFunction(() => document.querySelectorAll('.yt-thumb').length === 5);
    await page.waitForFunction(() => [...document.querySelectorAll('.yt-thumb img')].every((i) => i.complete));
    // From now on the browser refuses the direct download (as some browsers do for other sites' images).
    await page.context().unroute('https://i.ytimg.com/**');
    await page.context().route('https://i.ytimg.com/**', (route) => route.abort());
    await page.evaluate(() => { const open = window.open; window.__opened = []; window.open = (u, ...r) => { window.__opened.push(String(u)); return open.call(window, u, ...r); }; });
    await Promise.all([page.waitForEvent('popup'), page.click('.yt-thumb:nth-child(3) .btn-primary')]);
    const opened = await page.evaluate(() => window.__opened);
    assert(opened.length === 1 && opened[0].endsWith('/hqdefault.jpg'), JSON.stringify(opened));
    await page.waitForFunction(() => document.querySelector('#yt-status').textContent.includes('new tab'));
  });

  test('youtube money calculator: ranges, own RPM, Shorts, embed code', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/youtube-money-calculator?v=10000&f=long&a=india&n=education&r=`);
    await page.waitForFunction(() => document.querySelector('#o-month').textContent.includes('7,500'));
    assert((await page.textContent('#o-month')).replace(/\s/g, '') === '₹7,500–₹30,000', await page.textContent('#o-month'));
    assert((await page.textContent('#o-views')) === '3,00,000', 'views per month');
    await page.fill('#r', '50');
    await page.waitForFunction(() => document.querySelector('#o-month').textContent.replace(/\s/g, '') === '₹15,000');
    await page.fill('#r', '');
    await page.selectOption('#f', 'shorts');
    await page.waitForFunction(() => document.querySelector('#o-note').textContent.includes('Shorts'));
    assert(await page.$('.embed-box .embed-code'), 'calculator is embeddable');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('youtube embed code generator: start time, privacy, autoplay, loop, fixed size, Shorts', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/youtube-embed-code-generator`);
    await page.fill('#ye-url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42');
    const code = () => page.inputValue('#ye-code');
    assert((await code()).includes('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=42"') && (await code()).includes('max-width:800px'), await code());
    await page.check('#ye-autoplay');
    await page.check('#ye-loop');
    assert((await code()).includes('autoplay=1&amp;mute=1&amp;loop=1&amp;playlist=dQw4w9WgXcQ') || (await code()).includes('autoplay=1&mute=1&loop=1&playlist=dQw4w9WgXcQ'), await code());
    await page.uncheck('#ye-resp');
    assert((await code()).includes('width="560" height="315"'), await code());
    await page.fill('#ye-start', '3:00');
    await page.fill('#ye-end', '1:00');
    await page.waitForFunction(() => document.querySelector('#ye-status').classList.contains('err'));
    await page.fill('#ye-end', '');
    await page.check('#ye-resp');
    await page.fill('#ye-url', 'https://youtube.com/shorts/dQw4w9WgXcQ');
    assert((await code()).includes('aspect-ratio:9/16'), 'Shorts are vertical');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('youtube timestamp links and chapters checker', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/youtube-timestamp-link-generator`);
    await page.fill('#yl-url', 'https://youtube.com/shorts/dQw4w9WgXcQ?feature=share');
    await page.fill('#yl-time', '2:15');
    const links = await page.$$eval('.yl-link code', (els) => els.map((e) => e.textContent));
    for (const want of ['https://youtu.be/dQw4w9WgXcQ?t=135', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=135s', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ?start=135']) assert(links.includes(want), `${want} in ${links}`);
    await page.click('[data-preset-id="chapters"]');
    await page.waitForSelector('#yl-ch-out .status.err');
    assert((await page.textContent('#yl-ch-out')).includes('Line 2'), 'points at the short chapter');
    await page.fill('#yl-ch', '0:00 Intro\n1:20 Setup\n4:05 Result');
    await page.waitForSelector('#yl-ch-out .status.ok');
    assert((await page.$$('.yl-chapters li')).length === 3, 'chapter list');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('youtube thumbnail resizer: thumbnail, banner and profile at exact sizes', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/youtube-thumbnail-resizer`);
    await page.setInputFiles('#yi-drop input[type=file]', fixture('photo.jpg'));
    await page.waitForSelector('#yi-panel:not(.hidden)');
    let d = await download(page, '#yi-download');
    assert(d.name.endsWith('-youtube-thumbnail-1280x720.jpg') && d.size < 2 * 1024 * 1024, JSON.stringify(d));
    assert((await dims(page, d.path)) === '1280x720', 'thumbnail size');
    await page.click('[data-preset-id="blur"]');
    await page.click('[data-preset-id="banner"]');
    d = await download(page, '#yi-download');
    assert((await dims(page, d.path)) === '2560x1440' && d.size < 6 * 1024 * 1024, 'banner size');
    await page.click('[data-preset-id="profile"]');
    d = await download(page, '#yi-download');
    assert((await dims(page, d.path)) === '800x800', 'profile size');
    assert(page.errors.length === 0, page.errors.join('\n'));
  });

  test('youtube tools: translated page and search', async () => {
    const page = await newPage();
    await page.goto(`${BASE}/hi/youtube-money-calculator`);
    assert((await page.textContent('h1')).includes('YouTube कमाई'), await page.textContent('h1'));
    await page.goto(`${BASE}/search?q=youtube+thumbnail+download`);
    await page.waitForURL((u) => u.pathname === '/youtube-thumbnail-downloader');
  });
};
