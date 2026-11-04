/** Loan-type EMI landing pages: each has its own defaults, ranges, tax rules and tips (no thin duplicates). */
export interface LoanType {
  slug: string; name: string; icon: string; amount: number; rate: number; years: number; maxAmount: number; maxYears: number; minRate: number; maxRate: number;
  rates: string; tenure: string; tax: string; tips: string[]; presets: { label: string; p: number; r: number; y: number }[];
}
export const LOANS: LoanType[] = [
  { slug: 'home', name: 'Home Loan', icon: '🏠', amount: 5000000, rate: 8.5, years: 20, maxAmount: 50000000, maxYears: 30, minRate: 6, maxRate: 14,
    rates: 'about 8–10% p.a. (floating, linked to the repo rate)', tenure: 'up to 30 years, usually until age 60–70',
    tax: 'Under the old regime, interest up to ₹2 lakh a year is deductible under Section 24(b) for a self-occupied home, and principal repayment counts towards the ₹1.5 lakh 80C limit. The new regime does not allow these for a self-occupied home.',
    tips: ['Floating-rate home loans have no prepayment penalty for individuals, so prepay whenever you can.', 'A 0.5% lower rate on ₹50 lakh over 20 years saves about ₹3.7 lakh; compare lenders and consider a balance transfer.', 'Keep the EMI within 40–50% of your take-home pay.'],
    presets: [{ label: '₹30L × 20 yrs', p: 3000000, r: 8.5, y: 20 }, { label: '₹50L × 20 yrs', p: 5000000, r: 8.5, y: 20 }, { label: '₹1 Cr × 25 yrs', p: 10000000, r: 8.6, y: 25 }] },
  { slug: 'car', name: 'Car Loan', icon: '🚗', amount: 800000, rate: 9.5, years: 5, maxAmount: 5000000, maxYears: 7, minRate: 7, maxRate: 16,
    rates: 'about 8.5–12% p.a. for new cars and higher for used cars', tenure: '1 to 7 years',
    tax: 'Car loans for personal use have no tax benefit. Self-employed people using the car for business may claim interest and depreciation as expenses.',
    tips: ['Keep the tenure to 5 years or less: cars lose value fast and long loans can exceed the car\'s value.', 'Compare the flat rate quoted by some dealers with the reducing-balance rate; a 5% flat rate is roughly 9% reducing.', 'Check foreclosure charges; fixed-rate car loans often charge 2–5%.'],
    presets: [{ label: '₹6L × 5 yrs', p: 600000, r: 9.5, y: 5 }, { label: '₹10L × 5 yrs', p: 1000000, r: 9, y: 5 }, { label: '₹15L × 7 yrs', p: 1500000, r: 9.5, y: 7 }] },
  { slug: 'personal', name: 'Personal Loan', icon: '💳', amount: 500000, rate: 12.5, years: 3, maxAmount: 4000000, maxYears: 7, minRate: 9, maxRate: 30,
    rates: 'about 10.5–24% p.a. depending on your credit score and employer', tenure: '1 to 5 years (some lenders up to 7)',
    tax: 'No tax benefit, unless the money is used to buy or renovate a house (Section 24b) or for business.',
    tips: ['Processing fees of 1–3% raise your real cost; use the loan comparison tool to see the true APR.', 'A credit score above 750 usually gets the best rates.', 'Personal loans are expensive: pay them off before investing extra money.'],
    presets: [{ label: '₹2L × 2 yrs', p: 200000, r: 13, y: 2 }, { label: '₹5L × 3 yrs', p: 500000, r: 12.5, y: 3 }, { label: '₹10L × 5 yrs', p: 1000000, r: 12, y: 5 }] },
  { slug: 'education', name: 'Education Loan', icon: '🎓', amount: 1500000, rate: 10, years: 10, maxAmount: 15000000, maxYears: 15, minRate: 7, maxRate: 16,
    rates: 'about 8–13% p.a.; abroad-study loans are often higher', tenure: 'up to 15 years after the moratorium (course period + 6–12 months)',
    tax: 'The entire interest paid is deductible under Section 80E for up to 8 years (old regime), with no upper limit.',
    tips: ['Interest during the moratorium is usually added to the loan; paying it while studying reduces the burden.', 'Government schemes and collateral-free limits differ by bank; compare carefully for abroad studies.', 'Use the EMI to check whether the expected salary after the course can repay it comfortably.'],
    presets: [{ label: '₹10L India (10 yrs)', p: 1000000, r: 10, y: 10 }, { label: '₹40L abroad (12 yrs)', p: 4000000, r: 11, y: 12 }] },
  { slug: 'bike', name: 'Bike Loan', icon: '🏍️', amount: 150000, rate: 11, years: 2, maxAmount: 1000000, maxYears: 5, minRate: 7, maxRate: 25,
    rates: 'about 9–18% p.a.', tenure: '1 to 4 years',
    tax: 'No tax benefit for personal use.',
    tips: ['A larger down payment cuts both EMI and interest.', 'Zero-interest offers often hide processing fees or higher on-road prices; compare the total cost.'],
    presets: [{ label: '₹1L × 2 yrs', p: 100000, r: 11, y: 2 }, { label: '₹2.5L × 3 yrs', p: 250000, r: 10.5, y: 3 }] },
  { slug: 'gold', name: 'Gold Loan', icon: '🪙', amount: 300000, rate: 9.5, years: 1, maxAmount: 5000000, maxYears: 3, minRate: 7, maxRate: 24,
    rates: 'about 8.5–18% p.a.', tenure: '6 months to 3 years; many are bullet repayments rather than EMIs',
    tax: 'No tax benefit, unless used for business or a house.',
    tips: ['Lenders lend up to 75% of the gold value (LTV).', 'Many gold loans let you pay only interest monthly and the principal at the end; this calculator shows the EMI equivalent.'],
    presets: [{ label: '₹1L × 1 yr', p: 100000, r: 9.5, y: 1 }, { label: '₹5L × 2 yrs', p: 500000, r: 9.5, y: 2 }] },
];
