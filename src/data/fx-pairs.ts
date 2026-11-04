/** Currency pair landing pages (/usd-to-inr …). Each has its own context paragraph, so none is a thin duplicate. */
export interface Pair { from: string; to: string; name: string; context: string; salaryLink?: string }
export const PAIRS: Pair[] = [
  { from: 'USD', to: 'INR', name: 'US dollar to Indian rupee', salaryLink: 'usa', context: 'USD to INR matters for US salaries and H-1B offers, freelancing and remote-work invoices, US stock investments, tuition fees for US universities and remittances to India.' },
  { from: 'GBP', to: 'INR', name: 'British pound to Indian rupee', salaryLink: 'uk', context: 'GBP to INR is used for UK job offers and Skilled Worker visas, university fees in the UK, and money sent home by the large Indian community in Britain.' },
  { from: 'EUR', to: 'INR', name: 'Euro to Indian rupee', salaryLink: 'germany', context: 'EUR to INR covers salaries and Blue Card offers in Germany, the Netherlands, Ireland and France, Schengen travel budgets and European freelance clients.' },
  { from: 'AED', to: 'INR', name: 'UAE dirham to Indian rupee', salaryLink: 'uae', context: 'The UAE is one of the largest sources of remittances to India. The dirham is pegged to the US dollar at 3.6725, so AED to INR moves with USD to INR.' },
  { from: 'SAR', to: 'INR', name: 'Saudi riyal to Indian rupee', salaryLink: 'saudi-arabia', context: 'The Saudi riyal is pegged at 3.75 per US dollar. Millions of Indians working in Saudi Arabia check SAR to INR before sending money home.' },
  { from: 'QAR', to: 'INR', name: 'Qatari riyal to Indian rupee', salaryLink: 'qatar', context: 'The Qatari riyal is pegged at 3.64 per US dollar, so QAR to INR follows USD to INR.' },
  { from: 'CAD', to: 'INR', name: 'Canadian dollar to Indian rupee', salaryLink: 'canada', context: 'CAD to INR matters for Canadian PR and study-permit holders, college fees and GIC deposits, and job offers in Toronto and Vancouver.' },
  { from: 'AUD', to: 'INR', name: 'Australian dollar to Indian rupee', salaryLink: 'australia', context: 'AUD to INR is used for Australian university fees, skilled visa job offers in Sydney and Melbourne, and remittances to India.' },
  { from: 'SGD', to: 'INR', name: 'Singapore dollar to Indian rupee', salaryLink: 'singapore', context: 'SGD to INR is relevant for Employment Pass offers in Singapore, a top destination for Indian tech and finance professionals.' },
  { from: 'OMR', to: 'INR', name: 'Omani rial to Indian rupee', context: 'The Omani rial is pegged at 0.3845 per US dollar and is one of the highest-valued currencies; many Indians in Oman send money home every month.' },
  { from: 'INR', to: 'USD', name: 'Indian rupee to US dollar', salaryLink: 'usa', context: 'INR to USD helps when paying for US courses, software subscriptions and travel, or when comparing an Indian salary with US pay.' },
];
