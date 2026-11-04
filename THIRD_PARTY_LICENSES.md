# Third-party software

This project's own code is MIT-licensed. It bundles or loads these open-source components, all of which permit commercial use:

| Component | Used for | License | Notes |
|---|---|---|---|
| [Astro](https://github.com/withastro/astro) | Static site build | MIT | Build-time only |
| [pdf-lib](https://github.com/Hopding/pdf-lib) | Creating and editing PDFs | MIT | |
| [pdf.js / pdfjs-dist](https://github.com/mozilla/pdf.js) | Rendering PDFs | Apache-2.0 | Includes Foxit/Liberation fonts and JBIG2/OpenJPEG/QCMS/QuickJS WASM, each under its own permissive licence (see `node_modules/pdfjs-dist`) |
| [Mediabunny](https://github.com/Vanilagy/mediabunny) | Video/audio reading, writing, conversion | MPL-2.0 | Used unmodified |
| [@mediabunny/mp3-encoder](https://github.com/Vanilagy/mediabunny) | MP3 encoding | MPL-2.0 + LGPL ([LAME](https://lame.sourceforge.io/)) | Loaded as a separate, replaceable WASM chunk. Thanks to the LAME project. |
| [@mediabunny/aac-encoder](https://github.com/Vanilagy/mediabunny) | AAC fallback encoding | MPL-2.0 + LGPL ([FFmpeg](https://ffmpeg.org/) native AAC encoder) | Loaded as a separate, replaceable WASM chunk |
| [heic-to](https://github.com/hoppergee/heic-to) / [libheif](https://github.com/strukturag/libheif) | Decoding iPhone HEIC photos | LGPL-3.0 | Loaded as a separate, unmodified chunk only when a HEIC file is opened; users may replace it |
| [qrcode](https://github.com/soldair/node-qrcode) | QR code generation | MIT | |
| [UPNG.js](https://github.com/photopea/UPNG.js) + [pako](https://github.com/nodeca/pako) | Lossy PNG compression | MIT / (MIT AND Zlib) | |
| [fflate](https://github.com/101arrowz/fflate) | ZIP downloads | MIT | |
| [gifenc](https://github.com/mattdesl/gifenc) | Animated GIF encoding | MIT | |
| [Tesseract.js](https://github.com/naptha/tesseract.js) + tesseract.js-core | OCR (image to text) | Apache-2.0 | Self-hosted under /vendor/tesseract |
| [@tesseract.js-data/eng, hin](https://github.com/naptha/tessdata) | OCR language models | MIT (models: Apache-2.0, Google Tesseract) | |
| Google Fonts (Caveat, Kalam, Homemade Apple, Indie Flower, Shadows Into Light, Gloria Hallelujah, Reenie Beanie, Dancing Script, Great Vibes, Satisfy) | Handwriting and signature styles | SIL Open Font License / Apache-2.0 | Loaded from fonts.googleapis.com on two pages |

**Deliberately not used** because of licence conflicts with an ad-supported site: ffmpeg.wasm builds with x264 (GPL), @imgly/background-removal (AGPL), BRIA RMBG models (non-commercial).
