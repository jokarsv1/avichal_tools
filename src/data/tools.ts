/**
 * Tool registry: the single source of truth for navigation, the home page, category hubs,
 * "related tools", the sitemap and the roadmap.
 *
 * To add a tool: add an entry here, then create src/pages/<slug>.astro (see docs/ADDING-A-TOOL.md).
 */

export type CategoryId = 'pdf' | 'image' | 'video' | 'finance' | 'abroad' | 'exam' | 'student' | 'everyday';

export interface Category {
  id: CategoryId;
  /** Short label used in the header tabs. */
  label: string;
  /** Hub page path. */
  path: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'pdf', label: 'PDF', path: '/pdf-tools', icon: '📄', color: '#e11d48',
    title: 'Free PDF Tools: Compress, Merge, Split, Convert',
    description: 'Compress, merge, split, rotate and convert PDF files for free. Everything runs in your browser, so your documents are never uploaded.' },
  { id: 'image', label: 'Image', path: '/image-tools', icon: '🖼️', color: '#0891b2',
    title: 'Free Image Tools: Compress, Resize, Convert, Crop',
    description: 'Compress images to an exact KB size, resize, crop and convert JPG, PNG, WebP and HEIC. No upload, no watermark, no sign-up.' },
  { id: 'video', label: 'Video', path: '/video-tools', icon: '🎬', color: '#7c3aed',
    title: 'Free Video Tools: Compress, Trim, Convert, Record',
    description: 'Compress, trim and convert videos, extract MP3 audio and record your screen. No watermark and no upload: it runs on your device.' },
  { id: 'finance', label: 'Finance', path: '/finance-calculators', icon: '💰', color: '#059669',
    title: 'Free Finance Calculators: EMI, SIP, Income Tax, GST',
    description: 'EMI, SIP, income tax (new vs old regime), GST, FD and PPF calculators with year-by-year tables and shareable results.' },
  { id: 'abroad', label: 'Abroad', path: '/move-abroad-tools', icon: '✈️', color: '#0ea5e9',
    title: 'Moving Abroad Tools: Salary vs India, PPP, Currency',
    description: 'Compare a foreign job offer with India: take-home after tax, living costs, savings in rupees, PPP, and live currency rates for USD, GBP, EUR, AED and more.' },
  { id: 'exam', label: 'Exam & Govt', path: '/exam-tools', icon: '🏛️', color: '#d97706',
    title: 'Exam Photo & Signature Resizer and Government Form Tools',
    description: 'Resize photos and signatures to the exact KB and pixel size for SSC, IBPS, UPSC, NEET, JEE and PAN card forms. Free, private and instant.' },
  { id: 'student', label: 'Student', path: '/student-tools', icon: '🎓', color: '#2563eb',
    title: 'Free Student Tools: Attendance, CGPA, Handwriting',
    description: 'Attendance calculator, CGPA to percentage converter, text to handwriting and more free tools for students.' },
  { id: 'everyday', label: 'Everyday', path: '/everyday-tools', icon: '🧰', color: '#475569',
    title: 'Free Everyday Tools: QR Code, Word Counter, Age, Percentage',
    description: 'QR code generator, UPI QR code, word counter, age calculator, percentage calculator and number to words.' },
];

export interface Tool {
  slug: string;
  /** Short name for cards and nav. */
  name: string;
  /** SEO <title> (the brand is appended automatically). Keep the main keyword first. */
  title: string;
  /** Meta description, max ~155 characters. */
  description: string;
  /** One-line card text. */
  short: string;
  category: CategoryId;
  icon: string;
  /** 'live' tools are built; 'planned' ones show only on the roadmap page. */
  status: 'live' | 'planned';
  /** Extra search phrases for the on-site search box. */
  keywords?: string;
  /** Show this tool in the home page "popular" row. */
  popular?: boolean;
  /** Pages that only make sense on a desktop (e.g. screen recording). */
  desktopOnly?: boolean;
}

export const TOOLS: Tool[] = [
  // ---------- PDF ----------
  { slug: 'compress-pdf', name: 'Compress PDF', category: 'pdf', icon: '🗜️', status: 'live', popular: true,
    title: 'Compress PDF Online Free – Reduce PDF Size Without Uploading',
    description: 'Reduce PDF file size for free, in your browser. No upload, no sign-up and no daily limits. Choose a compression level and download instantly.',
    short: 'Make PDFs smaller while keeping text sharp.', keywords: 'reduce pdf size shrink pdf pdf compressor 1mb 500kb 200kb' },
  { slug: 'merge-pdf', name: 'Merge PDF', category: 'pdf', icon: '🔗', status: 'live', popular: true,
    title: 'Merge PDF Online Free – Combine PDF Files in Your Browser',
    description: 'Combine multiple PDF files into one, in any order. Free, unlimited and private: files never leave your device.',
    short: 'Combine several PDFs into one file.', keywords: 'combine pdf join pdf' },
  { slug: 'split-pdf', name: 'Split PDF', category: 'pdf', icon: '✂️', status: 'live',
    title: 'Split PDF Online Free – Extract Pages or Split Into Files',
    description: 'Split a PDF into separate files or extract a page range. Free, unlimited and private. Nothing is uploaded.',
    short: 'Extract pages or split a PDF into parts.', keywords: 'extract pages separate pdf cut pdf' },
  { slug: 'jpg-to-pdf', name: 'JPG to PDF', category: 'pdf', icon: '🖼️', status: 'live', popular: true,
    title: 'JPG to PDF Converter Free – Images to PDF, No Upload',
    description: 'Convert JPG, PNG, WebP and HEIC photos to a single PDF. Pick A4 or Letter, margins and order. Free, private, no watermark.',
    short: 'Turn photos and scans into one PDF.', keywords: 'image to pdf png to pdf photo to pdf heic to pdf' },
  { slug: 'pdf-to-jpg', name: 'PDF to JPG', category: 'pdf', icon: '🏞️', status: 'live',
    title: 'PDF to JPG Converter Free – Convert PDF Pages to Images',
    description: 'Convert every PDF page to a high-quality JPG or PNG image. Choose resolution, download as ZIP. Free and private.',
    short: 'Save PDF pages as JPG or PNG images.', keywords: 'pdf to image pdf to png' },
  { slug: 'rotate-pdf', name: 'Rotate PDF', category: 'pdf', icon: '🔄', status: 'live',
    title: 'Rotate PDF Online Free – Rotate One Page or All Pages',
    description: 'Rotate PDF pages left or right and save permanently. Rotate single pages or the whole document. Free, private, no upload.',
    short: 'Fix sideways or upside-down pages.', keywords: 'turn pdf pages' },
  { slug: 'organize-pdf', name: 'Organize PDF', category: 'pdf', icon: '🗂️', status: 'live',
    title: 'Organize PDF – Reorder, Delete and Rotate PDF Pages Free',
    description: 'Drag to reorder PDF pages, delete pages you do not need and rotate the rest. Free, unlimited and fully in your browser.',
    short: 'Reorder, delete and rotate pages.', keywords: 'delete pdf pages remove pages reorder pdf rearrange' },
  { slug: 'add-page-numbers-to-pdf', name: 'Add Page Numbers', category: 'pdf', icon: '🔢', status: 'live',
    title: 'Add Page Numbers to PDF Online Free',
    description: 'Insert page numbers into a PDF: choose position, format ("Page 1 of 10"), size and starting number. Free and private.',
    short: 'Number the pages of any PDF.', keywords: 'pdf page numbering' },
  { slug: 'watermark-pdf', name: 'Watermark PDF', category: 'pdf', icon: '💧', status: 'live',
    title: 'Add Watermark to PDF Online Free – Text Watermark',
    description: 'Stamp a text watermark such as CONFIDENTIAL or your name on every PDF page. Control opacity, angle and size. Free, private.',
    short: 'Stamp text across every page.', keywords: 'pdf stamp confidential' },
  { slug: 'edit-pdf', name: 'Edit PDF', category: 'pdf', icon: '📝', status: 'live', popular: true,
    title: 'Edit PDF Online Free – Add Text, White-out, Highlight',
    description: 'Add text, white-out, highlights, boxes and images to a PDF in your browser. True redaction option. Free, no sign-up, no upload.',
    short: 'Add text, white-out, highlight, images.', keywords: 'pdf editor add text to pdf write on pdf redact pdf whiteout fill pdf' },
  { slug: 'sign-pdf', name: 'Sign PDF', category: 'pdf', icon: '✍️', status: 'live', popular: true,
    title: 'Sign PDF Online Free – Add Your Signature, No Sign-Up',
    description: 'Draw, type or upload your signature and place it on any PDF page. Free e-signature with no account and no upload.',
    short: 'Draw or type a signature and place it.', keywords: 'esign e-signature fill and sign signature on pdf' },

  // ---------- Image ----------
  { slug: 'resize-image-to-kb', name: 'Resize Image to KB', category: 'image', icon: '🎯', status: 'live', popular: true,
    title: 'Resize Image to KB – Compress Photo to Exact KB Size Online',
    description: 'Compress a photo or signature to an exact size in KB (e.g. 20 KB, 50 KB, 100 KB) with optional pixel size and DPI. Free, no upload.',
    short: 'Hit an exact KB size, minimum and maximum.', keywords: 'compress image to kb reduce photo size kb jpeg 20kb 50kb 100kb' },
  { slug: 'image-compressor', name: 'Image Compressor', category: 'image', icon: '📉', status: 'live', popular: true,
    title: 'Image Compressor – Compress JPG, PNG, WebP Online Free',
    description: 'Compress JPG, PNG and WebP images in bulk without visible quality loss. No upload, no limit on file count. Download as ZIP.',
    short: 'Shrink JPG, PNG and WebP in bulk.', keywords: 'compress image reduce image size tinypng compress png compress jpeg' },
  { slug: 'resize-image', name: 'Image Resizer', category: 'image', icon: '📐', status: 'live',
    title: 'Resize Image Online Free – Change Image Size in Pixels',
    description: 'Resize images by pixels or percentage, or use presets for Instagram, WhatsApp, YouTube and passport sizes. Bulk, free, private.',
    short: 'Change width and height in pixels or %.', keywords: 'image resizer photo resizer change dimensions' },
  { slug: 'crop-image', name: 'Crop Image', category: 'image', icon: '✂️', status: 'live',
    title: 'Crop Image Online Free – Square, Circle and Custom Crop',
    description: 'Crop photos to any size or aspect ratio (1:1, 4:5, 16:9) or make a circle profile picture. Free, private and instant.',
    short: 'Crop to any ratio, or a circle.', keywords: 'circle crop profile picture square crop' },
  { slug: 'heic-to-jpg', name: 'HEIC to JPG', category: 'image', icon: '🍏', status: 'live',
    title: 'HEIC to JPG Converter – Convert iPhone Photos Free',
    description: 'Convert iPhone HEIC/HEIF photos to JPG or PNG in bulk, right in your browser. No upload, no app needed, no watermark.',
    short: 'Convert iPhone photos to JPG.', keywords: 'heif to jpg iphone photo convert' },
  { slug: 'png-to-jpg', name: 'PNG to JPG', category: 'image', icon: '🔁', status: 'live',
    title: 'PNG to JPG Converter Online Free – Bulk, No Upload',
    description: 'Convert PNG images to JPG in bulk. Choose quality and background colour for transparent areas. Free and private.',
    short: 'Convert PNG to smaller JPG files.' },
  { slug: 'jpg-to-png', name: 'JPG to PNG', category: 'image', icon: '🔁', status: 'live',
    title: 'JPG to PNG Converter Online Free – Bulk, No Upload',
    description: 'Convert JPG or JPEG photos to PNG format in bulk. Lossless output, free, private and instant.',
    short: 'Convert JPG to lossless PNG.' },
  { slug: 'webp-to-jpg', name: 'WebP to JPG', category: 'image', icon: '🔁', status: 'live',
    title: 'WebP to JPG Converter Online Free – Bulk, No Upload',
    description: 'Convert WebP images to JPG or PNG so they open everywhere. Bulk conversion, free and fully private.',
    short: 'Make WebP images open everywhere.', keywords: 'webp to png' },
  { slug: 'image-converter', name: 'Image Converter', category: 'image', icon: '🔄', status: 'live',
    title: 'Image Converter – Convert to JPG, PNG, WebP Online Free',
    description: 'Convert images between JPG, PNG, WebP and HEIC. Bulk conversion with quality control, free and private.',
    short: 'Convert between JPG, PNG, WebP, HEIC.', keywords: 'convert image format' },

  // ---------- Exam & Govt ----------
  { slug: 'exam-photo-resizer', name: 'Exam Photo Resizer', category: 'exam', icon: '🪪', status: 'live', popular: true,
    title: 'Exam Photo & Signature Resizer – SSC, IBPS, UPSC, NEET',
    description: 'Resize photo and signature to the exact KB and pixel size for SSC, IBPS, UPSC, NEET, JEE and PAN forms. Free, private, instant.',
    short: 'Presets for SSC, IBPS, UPSC, NEET, PAN.', keywords: 'photo signature resize sarkari form government exam passport photo' },
  { slug: 'signature-resizer', name: 'Signature Resizer', category: 'exam', icon: '🖊️', status: 'live',
    title: 'Signature Resizer – Resize Signature to 10-20 KB Online',
    description: 'Resize and clean a scanned signature to 10-20 KB (or any size) with a white background for exam and government forms. Free, private.',
    short: 'Clean and resize a signature to KB.', keywords: 'signature compress signature 20kb signature size' },

  // ---------- Video ----------
  { slug: 'compress-video', name: 'Compress Video', category: 'video', icon: '🗜️', status: 'live', popular: true,
    title: 'Compress Video Online Free – Reduce MP4 Size, No Watermark',
    description: 'Reduce video size for WhatsApp, email or Discord, with no watermark and no upload. Pick quality, resolution or a target size in MB.',
    short: 'Shrink videos to a target MB, no watermark.', keywords: 'reduce video size video compressor mp4 compress whatsapp discord 25mb' },
  { slug: 'trim-video', name: 'Trim Video', category: 'video', icon: '✂️', status: 'live',
    title: 'Trim Video Online Free – Cut MP4 Without Watermark',
    description: 'Cut the start and end off a video in your browser. Fast, free, no watermark and no upload. Works with MP4, MOV and WebM.',
    short: 'Cut the start or end of a clip.', keywords: 'cut video video cutter clip video' },
  { slug: 'video-to-mp3', name: 'Video to MP3', category: 'video', icon: '🎵', status: 'live', popular: true,
    title: 'Video to MP3 Converter – Extract Audio From MP4 Free',
    description: 'Extract the audio from MP4, MOV or WebM videos and save it as MP3. Free, fast and private. Files never leave your device.',
    short: 'Extract MP3 audio from a video.', keywords: 'mp4 to mp3 extract audio convert video to audio' },
  { slug: 'mov-to-mp4', name: 'MOV to MP4', category: 'video', icon: '🎞️', status: 'live',
    title: 'MOV to MP4 Converter Online Free – Also MKV, WebM',
    description: 'Convert MOV, MKV and WebM videos to MP4 that plays everywhere. Free, no watermark and no upload.',
    short: 'Convert MOV, MKV, WebM to MP4.', keywords: 'convert video to mp4 mkv to mp4 webm to mp4 video converter' },
  { slug: 'remove-audio-from-video', name: 'Mute Video', category: 'video', icon: '🔇', status: 'live',
    title: 'Remove Audio From Video Online Free – Mute Video',
    description: 'Remove the sound from a video in seconds, without re-encoding. Free, private and no watermark.',
    short: 'Remove the sound track from a video.', keywords: 'mute video remove sound' },
  { slug: 'screen-recorder', name: 'Screen Recorder', category: 'video', icon: '⏺️', status: 'live', desktopOnly: true,
    title: 'Free Online Screen Recorder – No Watermark, No Time Limit',
    description: 'Record your screen, a window or a tab with microphone audio, straight from the browser. No install, no watermark, no time limit.',
    short: 'Record screen + mic, no watermark.', keywords: 'record screen capture screen video' },

  // ---------- Finance ----------
  { slug: 'emi-calculator', name: 'EMI Calculator', category: 'finance', icon: '🏦', status: 'live', popular: true,
    title: 'EMI Calculator – Home, Car & Personal Loan EMI With Table',
    description: 'Calculate your loan EMI, total interest and a month-by-month amortization schedule for home, car or personal loans. Free and instant.',
    short: 'Loan EMI with amortization schedule.', keywords: 'loan calculator home loan car loan personal loan' },
  { slug: 'sip-calculator', name: 'SIP Calculator', category: 'finance', icon: '📈', status: 'live', popular: true,
    title: 'SIP Calculator – Mutual Fund Returns With Step-Up SIP',
    description: 'Estimate mutual fund SIP returns with optional annual step-up and lump sum. See invested amount, gains and a year-wise table.',
    short: 'SIP + step-up + lump sum returns.', keywords: 'mutual fund calculator step up sip lumpsum' },
  { slug: 'income-tax-calculator', name: 'Income Tax Calculator', category: 'finance', icon: '🧾', status: 'live', popular: true,
    title: 'Income Tax Calculator FY 2026-27 – New vs Old Regime',
    description: 'Compare tax under the new and old regime for FY 2026-27 (AY 2027-28), with standard deduction, 87A rebate, surcharge and cess.',
    short: 'New vs old regime, FY 2026-27.', keywords: 'tax calculator new regime old regime salary tax india' },
  { slug: 'gst-calculator', name: 'GST Calculator', category: 'finance', icon: '🧮', status: 'live',
    title: 'GST Calculator India – Add or Remove GST (5%, 18%, 40%)',
    description: 'Add GST to a price or remove GST from an inclusive amount, with CGST/SGST/IGST split. Supports the 5%, 18% and 40% slabs.',
    short: 'Add or remove GST with CGST/SGST.', keywords: 'gst inclusive exclusive cgst sgst igst' },
  { slug: 'hra-calculator', name: 'HRA Calculator', category: 'finance', icon: '🏠', status: 'live',
    title: 'HRA Exemption Calculator – Tax-free HRA u/s 10(13A)',
    description: 'Calculate how much of your House Rent Allowance is exempt from tax and how much is taxable, for metro and non-metro cities.',
    short: 'Exempt and taxable HRA.', keywords: 'house rent allowance hra exemption' },
  { slug: 'lumpsum-calculator', name: 'Lumpsum Calculator', category: 'finance', icon: '💹', status: 'live',
    title: 'Lumpsum Calculator – One-time Investment Returns',
    description: 'Calculate the future value of a one-time mutual fund or stock investment with year-by-year growth. Free and instant.',
    short: 'Future value of a one-time investment.', keywords: 'lump sum mutual fund one time investment' },
  { slug: 'swp-calculator', name: 'SWP Calculator', category: 'finance', icon: '🧓', status: 'live',
    title: 'SWP Calculator – Monthly Withdrawal & How Long Money Lasts',
    description: 'Plan a systematic withdrawal plan: monthly income from a mutual fund corpus, balance left and when the money runs out.',
    short: 'Monthly income from a corpus.', keywords: 'systematic withdrawal plan retirement income' },
  { slug: 'rd-calculator', name: 'RD Calculator', category: 'finance', icon: '🐖', status: 'live',
    title: 'RD Calculator – Recurring Deposit Maturity (Bank Formula)',
    description: 'Calculate recurring deposit maturity and interest with quarterly compounding, as used by Indian banks and post offices.',
    short: 'Recurring deposit maturity.', keywords: 'recurring deposit post office rd sbi rd' },
  { slug: 'cagr-calculator', name: 'CAGR Calculator', category: 'finance', icon: '📊', status: 'live',
    title: 'CAGR Calculator – Compound Annual Growth Rate',
    description: 'Calculate the CAGR of an investment or business between two values, or project a future value at a given growth rate.',
    short: 'Annual growth rate between two values.', keywords: 'compound annual growth rate returns' },
  { slug: 'gratuity-calculator', name: 'Gratuity Calculator', category: 'finance', icon: '🎁', status: 'live',
    title: 'Gratuity Calculator 2026 – 15/26 Formula, New Labour Code',
    description: 'Calculate gratuity with the 15/26 formula, 6-month rounding, fixed-term eligibility under the 2025 labour codes and the ₹20 lakh tax-free limit.',
    short: 'Gratuity amount and tax-free limit.', keywords: 'gratuity formula labour code fixed term' },
  { slug: 'fd-calculator', name: 'FD Calculator', category: 'finance', icon: '🏧', status: 'live',
    title: 'FD Calculator – Fixed Deposit Maturity & Interest',
    description: 'Calculate fixed deposit maturity amount and interest with quarterly, monthly or yearly compounding. Free and instant.',
    short: 'Fixed deposit maturity and interest.', keywords: 'fixed deposit calculator' },
  { slug: 'ppf-calculator', name: 'PPF Calculator', category: 'finance', icon: '🛡️', status: 'live',
    title: 'PPF Calculator – Public Provident Fund Maturity',
    description: 'Calculate PPF maturity value, interest earned and a year-wise balance for 15 years or with extensions.',
    short: 'PPF maturity with yearly table.', keywords: 'public provident fund' },

  // ---------- Abroad ----------
  { slug: 'ppp-salary-calculator', name: 'Salary Abroad vs India', category: 'abroad', icon: '🌍', status: 'live', popular: true,
    title: 'Salary Abroad vs India Calculator – PPP, Tax & Savings in ₹',
    description: 'Compare a job offer in the US, UK, Canada, Germany, UAE and more with India: tax, living costs for your family, savings in rupees at live rates, PPP.',
    short: 'Foreign offer → savings in ₹, PPP, Indian CTC.', keywords: 'ppp calculator salary comparison usa vs india uk dubai abroad offer cost of living h1b' },
  { slug: 'salary-needed-abroad', name: 'Salary to Ask for Abroad', category: 'abroad', icon: '🤝', status: 'live', popular: true,
    title: 'What Salary to Ask for Abroad – From Your Indian CTC',
    description: 'Find the salary you need in the US, UK, Canada, Germany, Dubai or Singapore to save as much as you do in India. Free negotiation helper.',
    short: 'Indian CTC → salary to ask for abroad.', keywords: 'salary negotiation abroad relocation offer how much salary us uk dubai' },
  { slug: 'currency-converter', name: 'Currency Converter', category: 'abroad', icon: '💱', status: 'live',
    title: 'Currency Converter – Live USD, EUR, GBP, AED to INR Rates',
    description: 'Convert between the rupee and 35 currencies at live mid-market rates (ECB). USD, EUR, GBP, AED, SAR, CAD, AUD, SGD and more. Free, works offline.',
    short: 'Live rates for 35 currencies ↔ INR.', keywords: 'usd to inr dollar to rupee exchange rate forex aed to inr' },

  // ---------- Student ----------
  { slug: 'attendance-calculator', name: 'Attendance Calculator', category: 'student', icon: '📅', status: 'live', popular: true,
    title: 'Attendance Calculator – How Many Classes to Reach 75%',
    description: 'Find out how many classes you must attend to reach 75% (or any target), or how many you can safely skip. Free and instant.',
    short: 'Classes needed for 75%, or safe to bunk.', keywords: 'bunk calculator 75 percent attendance' },
  { slug: 'cgpa-to-percentage', name: 'CGPA to Percentage', category: 'student', icon: '🎓', status: 'live',
    title: 'CGPA to Percentage Converter – CBSE, VTU, Mumbai, AKTU',
    description: 'Convert CGPA or SGPA to percentage using CBSE (×9.5), university formulas or your own. Includes percentage to CGPA.',
    short: 'Convert CGPA/SGPA to percentage.', keywords: 'sgpa to percentage cgpa calculator' },
  { slug: 'text-to-handwriting', name: 'Text to Handwriting', category: 'student', icon: '📝', status: 'live',
    title: 'Text to Handwriting Converter – Realistic Notes on Paper',
    description: 'Turn typed text into realistic handwriting on lined paper. Choose fonts, ink colour and paper, then download as images or PDF.',
    short: 'Typed text to handwritten pages.', keywords: 'handwriting generator assignment' },

  // ---------- Everyday ----------
  { slug: 'qr-code-generator', name: 'QR Code Generator', category: 'everyday', icon: '🔳', status: 'live', popular: true,
    title: 'QR Code Generator Free – Never Expires, No Sign-Up',
    description: 'Create QR codes for links, Wi-Fi, text, email, phone and contacts. Static codes that never expire, with colours and logo. PNG and SVG.',
    short: 'Static QR codes that never expire.', keywords: 'qr code maker wifi qr vcard qr' },
  { slug: 'upi-qr-code-generator', name: 'UPI QR Code', category: 'everyday', icon: '📲', status: 'live',
    title: 'UPI QR Code Generator – Free Payment QR for GPay, PhonePe',
    description: 'Create a UPI payment QR code with your UPI ID, name and optional amount. Works with GPay, PhonePe, Paytm and BHIM. Printable.',
    short: 'Payment QR for any UPI ID.', keywords: 'upi qr payment qr gpay phonepe paytm' },
  { slug: 'word-counter', name: 'Word Counter', category: 'everyday', icon: '🔤', status: 'live',
    title: 'Word Counter – Count Words, Characters and Reading Time',
    description: 'Count words, characters, sentences and paragraphs, with reading time and limits for X, Instagram, LinkedIn and SEO.',
    short: 'Words, characters, reading time.', keywords: 'character counter letter count' },
  { slug: 'age-calculator', name: 'Age Calculator', category: 'everyday', icon: '🎂', status: 'live',
    title: 'Age Calculator – Exact Age in Years, Months and Days',
    description: 'Calculate exact age from date of birth in years, months and days, or age as on a specific date (for exam eligibility).',
    short: 'Exact age, or age as on a date.', keywords: 'date of birth calculator age as on date' },
  { slug: 'percentage-calculator', name: 'Percentage Calculator', category: 'everyday', icon: '％', status: 'live',
    title: 'Percentage Calculator – Percent Of, Change and Increase',
    description: 'Work out X% of Y, what percent X is of Y, and percentage increase or decrease. Instant, with the formula shown.',
    short: 'Percent of, percent change and more.', keywords: 'percent calculator increase decrease' },
  { slug: 'number-to-words', name: 'Number to Words', category: 'everyday', icon: '🔠', status: 'live',
    title: 'Number to Words Converter – Lakh, Crore and Rupees',
    description: 'Convert numbers to words in the Indian (lakh, crore) or international (million) system, including rupees and paise for cheques.',
    short: 'Amount in words, lakh/crore or million.', keywords: 'amount in words rupees in words cheque' },

  // ---------- Planned (shown on /roadmap only) ----------
  { slug: 'background-remover', name: 'Background Remover', category: 'image', icon: '🪄', status: 'live', popular: true,
    title: 'Remove Background From Photo Free – HD, No Watermark',
    description: 'Remove the background from photos of people: transparent PNG, white passport background, any colour or blur. AI runs on your device. Free, HD.',
    short: 'Remove or replace photo backgrounds.', keywords: 'remove bg background eraser transparent png white background passport photo' },
  { slug: 'resume-builder', name: 'Resume Builder', category: 'student', icon: '📃', status: 'live', popular: true,
    title: 'Free Resume Builder – ATS-Friendly PDF, No Sign-Up, No Watermark',
    description: 'Build a professional ATS-friendly resume and download the PDF free. Live preview, 3 templates, no sign-up, no watermark, no paywall.',
    short: 'ATS-friendly resume PDF, truly free.', keywords: 'cv maker resume maker cv builder ats resume fresher resume' },
  { slug: 'passport-photo-maker', name: 'Passport Photo Maker', category: 'exam', icon: '🛂', status: 'live', popular: true,
    title: 'Passport Size Photo Maker – 4x6 Print Sheet, Free',
    description: 'Make passport and visa photos at home: 35x45 mm, 2x2 inch and more. Face guide, 300 DPI, 8 photos on a 4x6 sheet. Free, no upload.',
    short: 'Passport photos + 4×6 print sheet.', keywords: 'passport size photo visa photo 35x45 2x2 photo print' },
  { slug: 'image-to-text', name: 'Image to Text (OCR)', category: 'image', icon: '🔍', status: 'live', popular: true,
    title: 'Image to Text Converter (OCR) – English & Hindi, Free',
    description: 'Extract text from images, screenshots and scanned PDFs in English and Hindi. OCR runs in your browser: free, private, no sign-up.',
    short: 'Extract text from images and scans.', keywords: 'ocr extract text photo to text screenshot to text hindi ocr scanned pdf to text' },
  { slug: 'pdf-to-word', name: 'PDF to Word', category: 'pdf', icon: '📝', status: 'planned', title: '', description: '', short: 'Editable DOCX from PDF.' },
  { slug: 'word-to-pdf', name: 'Word to PDF', category: 'pdf', icon: '📄', status: 'planned', title: '', description: '', short: 'DOCX to PDF.' },
  { slug: 'unlock-pdf', name: 'Unlock / Protect PDF', category: 'pdf', icon: '🔐', status: 'planned', title: '', description: '', short: 'Add or remove PDF passwords (qpdf WASM).' },
  { slug: 'video-to-gif', name: 'Video to GIF', category: 'video', icon: '🎞️', status: 'live',
    title: 'Video to GIF Converter – Make GIFs From MP4 Free',
    description: 'Turn a video clip into an animated GIF: choose start, end, frame rate and size. Free, no watermark, no upload.',
    short: 'Turn a clip into an animated GIF.', keywords: 'mp4 to gif gif maker animated gif' },
  { slug: 'audio-cutter', name: 'MP3 Cutter & Ringtone', category: 'video', icon: '🎶', status: 'live',
    title: 'MP3 Cutter & Ringtone Maker – Cut Audio Online Free',
    description: 'Cut MP3 and audio files with a waveform editor, add fade in/out and save as MP3 or iPhone M4R ringtone. Free, private, no upload.',
    short: 'Cut audio, fade, make ringtones.', keywords: 'ringtone maker cut mp3 audio trimmer m4r' },
  { slug: 'speech-to-text', name: 'Speech to Text', category: 'video', icon: '🗣️', status: 'planned', title: '', description: '', short: 'On-device Whisper transcription and subtitles.' },
  { slug: 'invoice-generator', name: 'GST Invoice Generator', category: 'finance', icon: '🧾', status: 'live', popular: true,
    title: 'GST Invoice Generator Free – PDF Tax Invoice With UPI QR',
    description: 'Create GST tax invoices with automatic CGST/SGST or IGST, amount in words and a UPI pay-now QR. Download PDF. Free, no login.',
    short: 'GST invoice PDF with UPI QR.', keywords: 'bill maker invoice maker tax invoice gst bill quotation' },
  { slug: 'rent-receipt-generator', name: 'Rent Receipt Generator', category: 'finance', icon: '🏠', status: 'live',
    title: 'Rent Receipt Generator – Free PDF for HRA Claim',
    description: 'Generate monthly rent receipts for HRA claims with landlord PAN and revenue stamp box. Two receipts per A4 page. Free, private PDF.',
    short: 'Monthly rent receipts for HRA.', keywords: 'hra rent receipt format rent slip' },
  { slug: 'salary-calculator', name: 'Salary Calculator', category: 'finance', icon: '💼', status: 'live', popular: true,
    title: 'In-hand Salary Calculator – CTC to Take-home (FY 2026-27)',
    description: 'Convert CTC to monthly in-hand salary with basic, HRA, PF, gratuity, professional tax and income tax under the new or old regime.',
    short: 'CTC to monthly take-home pay.', keywords: 'ctc to in hand take home salary lpa salary breakup' },
  { slug: 'home-loan-prepayment-calculator', name: 'Loan Prepayment Calculator', category: 'finance', icon: '⏩', status: 'live',
    title: 'Home Loan Prepayment Calculator – Interest & Months Saved',
    description: 'See how much interest and time you save by prepaying your home loan: lump sum, extra monthly or yearly payments, reduce tenure or EMI.',
    short: 'Interest saved by prepaying a loan.', keywords: 'part payment prepayment foreclosure home loan' },
  { slug: 'bank-statement-analyzer', name: 'Bank Statement Analyzer', category: 'finance', icon: '📊', status: 'planned', title: '', description: '', short: 'Categorise spends from a PDF statement, on device.' },
  { slug: 'json-formatter', name: 'JSON Formatter', category: 'everyday', icon: '{ }', status: 'planned', title: '', description: '', short: 'Format, validate and minify JSON.' },
];

export const LIVE_TOOLS = TOOLS.filter((t) => t.status === 'live');

export function getTool(slug: string): Tool {
  const t = TOOLS.find((x) => x.slug === slug);
  if (!t) throw new Error(`Unknown tool slug: ${slug}. Add it to src/data/tools.ts`);
  return t;
}

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id)!;
}

export function toolsIn(id: CategoryId): Tool[] {
  return LIVE_TOOLS.filter((t) => t.category === id);
}

/** Related tools: same category first, then hand-picked cross-links. */
const CROSS_LINKS: Record<string, string[]> = {
  'resize-image-to-kb': ['exam-photo-resizer', 'signature-resizer', 'image-compressor'],
  'exam-photo-resizer': ['signature-resizer', 'passport-photo-maker', 'resize-image-to-kb'],
  'passport-photo-maker': ['exam-photo-resizer', 'resize-image-to-kb', 'crop-image'],
  'jpg-to-pdf': ['compress-pdf', 'merge-pdf', 'image-compressor'],
  'compress-pdf': ['merge-pdf', 'jpg-to-pdf', 'resize-image-to-kb'],
  'edit-pdf': ['sign-pdf', 'organize-pdf', 'compress-pdf'],
  'sign-pdf': ['edit-pdf', 'merge-pdf', 'compress-pdf'],
  'compress-video': ['trim-video', 'video-to-mp3', 'mov-to-mp4'],
  'income-tax-calculator': ['salary-calculator', 'hra-calculator', 'sip-calculator'],
  'ppp-salary-calculator': ['salary-needed-abroad', 'currency-converter', 'salary-calculator'],
  'salary-needed-abroad': ['ppp-salary-calculator', 'currency-converter', 'salary-calculator'],
  'currency-converter': ['ppp-salary-calculator', 'salary-calculator', 'sip-calculator'],
  'salary-calculator': ['income-tax-calculator', 'hra-calculator', 'sip-calculator'],
  'emi-calculator': ['home-loan-prepayment-calculator', 'sip-calculator', 'income-tax-calculator'],
  'upi-qr-code-generator': ['qr-code-generator', 'invoice-generator', 'gst-calculator'],
  'gst-calculator': ['invoice-generator', 'upi-qr-code-generator', 'income-tax-calculator'],
  'hra-calculator': ['rent-receipt-generator', 'income-tax-calculator', 'salary-calculator'],
  'rent-receipt-generator': ['hra-calculator', 'income-tax-calculator', 'salary-calculator'],
  'attendance-calculator': ['cgpa-to-percentage', 'text-to-handwriting', 'percentage-calculator'],
};

export function relatedTools(slug: string, n = 6): Tool[] {
  const me = getTool(slug);
  const picked = (CROSS_LINKS[slug] || []).map(getTool);
  const same = LIVE_TOOLS.filter((t) => t.category === me.category && t.slug !== slug);
  const out: Tool[] = [];
  for (const t of [...picked, ...same]) if (!out.includes(t) && t.slug !== slug) out.push(t);
  return out.slice(0, n);
}
