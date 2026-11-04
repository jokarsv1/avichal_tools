# Adding a new tool (≈30 minutes)

1. **Register it** in `src/data/tools.ts`: slug, name, SEO `title` (keyword first, < 60 chars), `description` (< 155 chars), `short` card text, `category`, `icon`, `status: 'live'`. That alone adds it to the home page, its category hub, related tools, `llms.txt` and the sitemap.
2. **Create the page** `src/pages/<slug>.astro`:

```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import Dropzone from '../components/Dropzone.astro';
const faqs = [{ q: 'Question people search?', a: 'Direct, useful answer.' }];
const steps = ['Step one.', 'Step two.'];
---
<ToolLayout slug="my-tool" steps={steps} faqs={faqs}>
  <Dropzone id="mt-drop" accept=".pdf" title="Choose a PDF" />
  <!-- your controls -->
  <script>import '../tools/my-tool';</script>
  <Fragment slot="content">
    <h2>Helpful explanation</h2>
    <p>300–800 words of genuinely useful content: how it works, tips, tables, limits.</p>
  </Fragment>
</ToolLayout>
```

3. **Write the logic** in `src/tools/my-tool.ts`. Reuse the helpers:
   - `lib/ui.ts`: `onFiles` (click/drop/paste), `downloadBlob`, `downloadZip`, `setStatus`, `setProgress`, `bindUrlState` (shareable calculator URLs)
   - `lib/image.ts`: `decodeImage` (incl. HEIC), `drawScaled`, `encodeToTarget` (exact KB), `canvasToBlob`
   - `lib/pdf.ts`: `loadDoc` (pdf-lib), `openPdfJs` + `renderPage`/`renderThumb` (pdf.js), `parsePages`
   - `lib/media.ts`: `probe`, `convert` (Mediabunny/WebCodecs: trim, resize, transcode, extract audio)
   - `lib/finance.ts`, `lib/format.ts`, `lib/charts.ts`, `components/SliderField.astro` for calculators
   - **Lazy-load heavy libraries** with `await import('…')` inside the click handler, never at the top of the page.
4. **Translate the name**: add `'my-tool': ['name', 'short text']` to each file in `src/i18n/lang/` (hi, bn, mr, te, ta). The tool then gets `/hi/my-tool` and the other language pages automatically, with translated steps and FAQs. `npm run test:unit` fails until all five are filled in. If the tool has new common labels (button or field text), add them to `phrases` in each language file.
5. **Test**: add a spec in `tests/specs/` (see the existing ones), then run `npm run build && npm run test:e2e -- my-tool`.
6. **Ship**: commit and push; Cloudflare redeploys automatically.

## Content rules (for SEO and AdSense)
- One page = one search intent. Don't create near-duplicate pages that only swap a number.
- Answer the question people actually search, in the first FAQ, in plain words.
- Link to 2–3 related tools in the content ("next step" links increase pages per visit).
- Check licences before adding any library or AI model (MIT/Apache/BSD/MPL/LGPL-as-separate-file = OK; AGPL/GPL-bundled/non-commercial = avoid).
