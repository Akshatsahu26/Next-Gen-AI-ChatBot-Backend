const KNOWLEDGE_BASE = [
  {
    id: 'kb-fraud-otp',
    topic: 'fraud',
    title: 'OTP and PIN safety',
    content:
      'Never share OTP, UPI PIN, CVV, card PIN, or internet banking password. Banks never ask these details over call, SMS, or WhatsApp.',
    tags: ['fraud', 'otp', 'security', 'phishing'],
  },
  {
    id: 'kb-fraud-report',
    topic: 'fraud',
    title: 'Fraud reporting flow',
    content:
      'If you suspect fraud, immediately block card and UPI, change passwords, contact bank helpline, and report at cybercrime helpline 1930 with evidence.',
    tags: ['fraud', 'report', 'cybercrime', '1930'],
  },
  {
    id: 'kb-emi-formula',
    topic: 'emi',
    title: 'EMI formula basics',
    content:
      'EMI uses principal P, monthly interest rate R, and tenure N months. Formula: EMI = P * R * (1+R)^N / ((1+R)^N - 1).',
    tags: ['emi', 'loan', 'formula', 'interest'],
  },
  {
    id: 'kb-loan-eligibility',
    topic: 'loan',
    title: 'Loan eligibility factors',
    content:
      'Loan approval depends on income stability, credit score, debt-to-income ratio, KYC correctness, and repayment history.',
    tags: ['loan', 'eligibility', 'credit score', 'kyc'],
  },
  {
    id: 'kb-loan-rejection',
    topic: 'loan',
    title: 'Reasons for loan rejection',
    content:
      'Common rejection reasons are low credit score, high current EMI burden, frequent credit enquiries, missing documents, and KYC mismatch.',
    tags: ['loan', 'rejection', 'cibil', 'documents'],
  },
  {
    id: 'kb-transaction-pending',
    topic: 'transaction',
    title: 'Pending transaction help',
    content:
      'For amount debited but not credited, wait bank settlement window, collect UTR/reference number, and raise dispute if unresolved after timeline.',
    tags: ['transaction', 'utr', 'pending', 'dispute'],
  },
  {
    id: 'kb-upi-limits',
    topic: 'transaction',
    title: 'UPI limits and failures',
    content:
      'UPI failures happen due to daily limit, wrong PIN, account linking issue, or bank downtime. Retry after confirming limit and PIN.',
    tags: ['upi', 'transaction', 'limit', 'failure'],
  },
  {
    id: 'kb-complaint-process',
    topic: 'complaint',
    title: 'Complaint resolution process',
    content:
      'A strong complaint includes issue summary, transaction references, date/time, screenshots, and expected resolution. Keep ticket ID for escalation.',
    tags: ['complaint', 'ticket', 'escalation', 'support'],
  },
  {
    id: 'kb-complaint-escalation',
    topic: 'complaint',
    title: 'Escalation ladder',
    content:
      'Escalate to nodal officer if unresolved within SLA. Further escalation can be made to RBI Ombudsman where applicable.',
    tags: ['complaint', 'escalation', 'ombudsman', 'rbi'],
  },
  {
    id: 'kb-account-security',
    topic: 'security',
    title: 'Account security hygiene',
    content:
      'Enable 2FA, use strong unique passwords, keep device OS updated, and avoid public Wi-Fi for critical banking transactions.',
    tags: ['security', '2fa', 'password'],
  },
  {
    id: 'kb-kyc-basics',
    topic: 'kyc',
    title: 'KYC checklist',
    content:
      'Typical KYC requires PAN, address proof, identity proof, and sometimes video verification. Incomplete KYC can limit account features.',
    tags: ['kyc', 'documents', 'account'],
  },
  {
    id: 'kb-credit-score',
    topic: 'loan',
    title: 'Improving credit score',
    content:
      'Pay dues on time, maintain low credit utilization, avoid frequent loan applications, and monitor credit report for errors.',
    tags: ['loan', 'credit score', 'cibil'],
  },
];

module.exports = {
  KNOWLEDGE_BASE,
};
