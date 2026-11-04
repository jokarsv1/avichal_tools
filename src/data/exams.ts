/**
 * Photo / signature specs for exam and government forms.
 *
 * IMPORTANT: portals change these every few years and third-party sites often disagree.
 * Each preset below follows the most commonly published figures as of LAST_CHECKED and is
 * deliberately chosen to sit INSIDE every reported range (e.g. UPSC photo max 200 KB satisfies
 * both the "200 KB" and "300 KB" variants). Users can always edit the values in the tool.
 * When a new notification comes out, update this file: it is the only place to change.
 */
export const LAST_CHECKED = 'November 2026';

export interface ImageSpec {
  id: string;
  label: string;
  kind: 'photo' | 'signature' | 'thumb' | 'document';
  /** Size limits in KB as written in the notification. */
  minKB?: number;
  maxKB: number;
  /** Output pixel size. Omit to keep the original size. */
  width?: number;
  height?: number;
  dpi?: number;
  /** Human-readable size as printed in the notification. */
  printed?: string;
}

export interface Exam {
  slug: string;
  name: string;
  fullName: string;
  officialSite: string;
  specs: ImageSpec[];
  notes: string[];
  /** Other exams/forms that use the same spec. */
  alsoFor?: string;
}

export const EXAMS: Exam[] = [
  {
    slug: 'ssc', name: 'SSC', fullName: 'Staff Selection Commission (CGL, CHSL, MTS, GD, CPO, Steno)',
    officialSite: 'https://ssc.gov.in',
    specs: [
      { id: 'ssc-photo', label: 'SSC Photo', kind: 'photo', minKB: 20, maxKB: 50, width: 413, height: 531, dpi: 300, printed: '3.5 cm × 4.5 cm, JPEG, 20–50 KB' },
      { id: 'ssc-sign', label: 'SSC Signature', kind: 'signature', minKB: 10, maxKB: 20, width: 472, height: 236, dpi: 300, printed: '4.0 cm × 2.0 cm, JPEG, 10–20 KB' },
    ],
    notes: [
      'Recent SSC applications also capture a live photograph through the webcam or the mySSC app. You may still need a photo file for One-Time Registration and some posts.',
      'The photo should be recent (not older than 3 months), in colour, without cap or spectacles, with both ears visible on a plain light background.',
      'Sign in running hand with a black or blue pen. Capital-letter signatures are not accepted.',
    ],
  },
  {
    slug: 'ibps', name: 'IBPS', fullName: 'IBPS PO, Clerk, SO and RRB (also SBI PO/Clerk)',
    officialSite: 'https://www.ibps.in',
    alsoFor: 'SBI PO, SBI Clerk, RBI Assistant and most bank exams use the same sizes.',
    specs: [
      { id: 'ibps-photo', label: 'IBPS Photo', kind: 'photo', minKB: 20, maxKB: 50, width: 200, height: 230, printed: '200 × 230 px, JPEG, 20–50 KB' },
      { id: 'ibps-sign', label: 'IBPS Signature', kind: 'signature', minKB: 10, maxKB: 20, width: 140, height: 60, printed: '140 × 60 px, JPEG, 10–20 KB' },
      { id: 'ibps-thumb', label: 'IBPS Left Thumb Impression', kind: 'thumb', minKB: 20, maxKB: 50, width: 240, height: 240, printed: '240 × 240 px, JPEG, 20–50 KB' },
      { id: 'ibps-decl', label: 'IBPS Handwritten Declaration', kind: 'document', minKB: 50, maxKB: 100, width: 800, height: 400, printed: '800 × 400 px, JPEG, 50–100 KB' },
    ],
    notes: [
      'A 200 × 230 px photo rarely reaches 20 KB on its own. This tool adds harmless padding so the file meets the minimum without changing the picture.',
      'The handwritten declaration must be in English, in your own handwriting, with black ink on white paper.',
      'Use black ink on white paper for the signature and thumb impression.',
    ],
  },
  {
    slug: 'upsc', name: 'UPSC', fullName: 'UPSC Civil Services, NDA, CDS, CAPF, ESE (One-Time Registration)',
    officialSite: 'https://upsconline.nic.in',
    specs: [
      { id: 'upsc-photo', label: 'UPSC Photo', kind: 'photo', minKB: 20, maxKB: 200, width: 600, height: 600, printed: 'JPG, 20–200/300 KB, at least 350 × 350 px' },
      { id: 'upsc-sign', label: 'UPSC Signature', kind: 'signature', minKB: 20, maxKB: 100, width: 500, height: 250, printed: 'JPG, 20–100/300 KB, 350–500 px wide' },
    ],
    notes: [
      'Some UPSC notifications require a recent photo that shows your name and the date the photo was taken. Check the current notice before uploading.',
      'Sources disagree between 200 KB and 300 KB as the upper limit, so the preset uses 200 KB, which passes both.',
      'Sign three times on white paper for exams that ask for it, then crop as instructed.',
    ],
  },
  {
    slug: 'neet', name: 'NEET UG', fullName: 'NEET UG (National Testing Agency)',
    officialSite: 'https://neet.nta.nic.in',
    alsoFor: 'CUET UG and most NTA exams ask for similar files.',
    specs: [
      { id: 'neet-passport', label: 'NEET Passport Photo', kind: 'photo', minKB: 10, maxKB: 200, width: 413, height: 531, dpi: 300, printed: 'Passport size, JPG, 10–200 KB' },
      { id: 'neet-postcard', label: 'NEET Postcard Photo (4×6 in)', kind: 'photo', minKB: 10, maxKB: 200, width: 1200, height: 1800, dpi: 300, printed: '4 × 6 inch, JPG, 10–200 KB' },
      { id: 'neet-sign', label: 'NEET Signature', kind: 'signature', minKB: 4, maxKB: 30, width: 413, height: 177, dpi: 300, printed: 'JPG, 4–30 KB' },
    ],
    notes: [
      'NTA usually asks for a passport photo and a postcard-size (4 × 6 inch) photo, with your name and date printed below the photo for some cycles.',
      'Use a white background, 80% face coverage, ears visible, no glasses.',
    ],
  },
  {
    slug: 'jee-main', name: 'JEE Main', fullName: 'JEE Main (National Testing Agency)',
    officialSite: 'https://jeemain.nta.nic.in',
    specs: [
      { id: 'jee-photo', label: 'JEE Main Photo', kind: 'photo', minKB: 10, maxKB: 200, width: 413, height: 531, dpi: 300, printed: 'JPG, 10–200 KB' },
      { id: 'jee-sign', label: 'JEE Main Signature', kind: 'signature', minKB: 4, maxKB: 30, width: 413, height: 177, dpi: 300, printed: 'JPG, 4–30 KB' },
    ],
    notes: [
      'Photo should be in colour or black and white with 80% face visible (without mask), ears visible, against a white background.',
      'Sign with a black pen on white paper; avoid capital-letter signatures.',
    ],
  },
  {
    slug: 'pan-card', name: 'PAN Card', fullName: 'PAN card application (Protean/NSDL and UTIITSL)',
    officialSite: 'https://www.protean-tinpan.com',
    specs: [
      { id: 'pan-photo', label: 'PAN Photo (Protean/NSDL)', kind: 'photo', maxKB: 50, width: 197, height: 276, dpi: 200, printed: '3.5 cm × 2.5 cm, 200 DPI, JPEG, max 50 KB' },
      { id: 'pan-sign', label: 'PAN Signature (Protean/NSDL)', kind: 'signature', maxKB: 50, width: 354, height: 157, dpi: 200, printed: '2 cm × 4.5 cm, 200 DPI, JPEG, max 50 KB' },
      { id: 'pan-uti-photo', label: 'PAN Photo (UTIITSL)', kind: 'photo', maxKB: 30, width: 213, height: 213, dpi: 300, printed: '213 × 213 px, 300 DPI, JPEG, max 30 KB' },
    ],
    notes: [
      'PAN portals check DPI. This tool writes the DPI into the JPEG header, which most online resizers do not.',
      'The signature must be on white paper with a black pen. Thumb impressions must be attested if you cannot sign.',
    ],
  },
];

export const ALL_SPECS: ImageSpec[] = EXAMS.flatMap((e) => e.specs);

/** Generic presets used by the "resize image to KB" page. */
export const GENERIC_SPECS: ImageSpec[] = [
  { id: 'kb-10', label: 'Under 10 KB', kind: 'photo', maxKB: 10 },
  { id: 'kb-20', label: 'Under 20 KB', kind: 'photo', maxKB: 20 },
  { id: 'kb-30', label: 'Under 30 KB', kind: 'photo', maxKB: 30 },
  { id: 'kb-50', label: 'Under 50 KB', kind: 'photo', maxKB: 50 },
  { id: 'kb-100', label: 'Under 100 KB', kind: 'photo', maxKB: 100 },
  { id: 'kb-200', label: 'Under 200 KB', kind: 'photo', maxKB: 200 },
  { id: 'kb-500', label: 'Under 500 KB', kind: 'photo', maxKB: 500 },
  { id: 'kb-1000', label: 'Under 1 MB', kind: 'photo', maxKB: 1000 },
  { id: 'passport-35x45', label: 'Passport photo 3.5×4.5 cm (413×531 px, 300 DPI)', kind: 'photo', maxKB: 100, width: 413, height: 531, dpi: 300 },
];

/** Long-tail landing pages: /compress-image-to-20kb etc. Each has its own copy (no thin pages). */
export interface KbPage { kb: number; uses: string; tip: string }
export const KB_PAGES: KbPage[] = [
  { kb: 10, uses: 'tiny signature uploads, some state-government portals, and thumbnail images for old forms', tip: 'At 10 KB a full photo usually needs to be small (around 200 px wide). The tool shrinks it automatically if quality alone is not enough.' },
  { kb: 20, uses: 'SSC and IBPS signatures (10–20 KB), scholarship portals and many state PSC forms', tip: 'Signatures compress very well because they are mostly white. Turn on "Clean signature" for crisp ink on pure white paper.' },
  { kb: 30, uses: 'NEET and JEE Main signatures (4–30 KB), UTIITSL PAN photos (max 30 KB) and college admission portals', tip: 'If your portal also has a minimum size, enter it in "Min KB" so the file is not rejected for being too small.' },
  { kb: 50, uses: 'SSC and IBPS photos (20–50 KB), PAN card photo and signature (max 50 KB), and most job application portals', tip: 'Set the exact pixel size your portal asks for (for example 200 × 230 px for IBPS) for the best quality at 50 KB.' },
  { kb: 100, uses: 'UPSC signatures, the IBPS handwritten declaration (50–100 KB), passport-photo uploads and email attachments', tip: '100 KB is enough for a sharp passport-size photo at 300 DPI.' },
  { kb: 200, uses: 'NEET and JEE photos (10–200 KB), UPSC photos, visa portals and university forms', tip: 'At 200 KB you can keep a large, high-quality photo. Only crop if the portal asks for a specific ratio.' },
  { kb: 500, uses: 'document scans, certificates, marksheets and portals with a 500 KB cap', tip: 'For scanned documents keep the text readable: use a width of about 1200–1600 px.' },
];
