/** Target sizes for /compress-pdf-to-[size] landing pages. */
export const PDF_SIZES = [
  { slug: '100kb', value: 100, unit: 'KB', uses: 'government job, scholarship and exam application forms that allow only tiny documents' },
  { slug: '200kb', value: 200, unit: 'KB', uses: 'certificates, caste or income certificates and mark sheets on recruitment and admission portals' },
  { slug: '300kb', value: 300, unit: 'KB', uses: 'university admission forms and online applications with a 300 KB document limit' },
  { slug: '500kb', value: 500, unit: 'KB', uses: 'bank KYC, insurance and loan applications, and many state government portals' },
  { slug: '1mb', value: 1, unit: 'MB', uses: 'visa and passport document uploads, HR onboarding and email attachments' },
  { slug: '2mb', value: 2, unit: 'MB', uses: 'larger reports, scanned agreements and multi-page statements on portals with a 2 MB limit' },
] as const;
