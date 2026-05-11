/**
 * Centralised company + bank configuration.
 * All values read from REACT_APP_* env vars; safe fallbacks for dev.
 *
 * Set in frontend/.env or frontend/.env.production:
 *
 *   REACT_APP_COMPANY_NAME=Hesh Opto Lab Private Limited
 *   REACT_APP_COMPANY_ADDRESS=123 Main Street, Chennai, Tamil Nadu - 600001
 *   REACT_APP_COMPANY_PHONE=+91 98765 43210
 *   REACT_APP_COMPANY_EMAIL=info@heshstore.in
 *   REACT_APP_COMPANY_WEBSITE=www.heshstore.in
 *   REACT_APP_COMPANY_GSTIN=33XXXXX0000X1Z5
 *   REACT_APP_LOGO_URL=/logo192.png
 *   REACT_APP_PAYMENT_TERMS=70% Advance & 30% Before Delivery
 *
 *   REACT_APP_BANK_ACCOUNT_NAME=Hesh Opto Lab Private Limited
 *   REACT_APP_BANK_NAME=HDFC Bank
 *   REACT_APP_BANK_ACCOUNT=12345678901234
 *   REACT_APP_BANK_IFSC=HDFC0001234
 *   REACT_APP_BANK_BRANCH=Anna Nagar, Chennai
 *   REACT_APP_BANK_UPI=heshopto@hdfcbank
 *   REACT_APP_BANK_QR_URL=/bank-qr.png
 */

const e = (key, fallback = '') =>
  (typeof process !== 'undefined' && process.env[`REACT_APP_${key}`]) || fallback;

export const company = {
  name:         e('COMPANY_NAME',    'Saachu'),
  state:        e('COMPANY_STATE',   'Tamil Nadu'),
  address:      e('COMPANY_ADDRESS', ''),
  phone:        e('COMPANY_PHONE',   ''),
  email:        e('COMPANY_EMAIL',   ''),
  website:      e('COMPANY_WEBSITE', ''),
  gstin:        e('COMPANY_GSTIN',   ''),
  logoUrl:      e('LOGO_URL',        '/logo192.png'),
  paymentTerms: e('PAYMENT_TERMS',   '70% Advance & 30% Before Delivery'),
};

export const bank = {
  accountName: e('BANK_ACCOUNT_NAME', ''),
  name:        e('BANK_NAME',         ''),
  branch:      e('BANK_BRANCH',       ''),
  account:     e('BANK_ACCOUNT',      ''),
  ifsc:        e('BANK_IFSC',         ''),
  upiId:       e('BANK_UPI',          ''),
  qrUrl:       e('BANK_QR_URL',       ''),
};

/** True if bank details have been configured. */
export const hasBankDetails = Boolean(bank.name || bank.account || bank.ifsc);
