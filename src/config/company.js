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

// Fallbacks below mirror the hardcoded defaults in
// backend/src/shared/pdf.service.ts so the printed quotation is correct
// even when REACT_APP_* env vars aren't wired up in a given environment.
export const company = {
  name:         e('COMPANY_NAME',    'Hesh Opto Lab Private Limited'),
  state:        e('COMPANY_STATE',   'Tamil Nadu'),
  address:      e('COMPANY_ADDRESS', 'No. 207 / 208 / 209, Sri Selva Vinayagar Nagar, Alinjivakkam, Redhills, Chennai, Tamil Nadu, 600052'),
  phone:        e('COMPANY_PHONE',   '7010366206'),
  email:        e('COMPANY_EMAIL',   'heshstoreaccounts@hotmail.com'),
  website:      e('COMPANY_WEBSITE', ''),
  gstin:        e('COMPANY_GSTIN',   '33AABCH5436K1ZM'),
  logoUrl:      e('LOGO_URL',        '/logo192.png'),
  paymentTerms: e('PAYMENT_TERMS',   '70% Advance & 30% Before Delivery'),
  msmeRegNo:    e('MSME_REG_NO',     'UDYAM-TN-02-0034349'),
  isoCert:      e('ISO_CERT',        'ISO 9001 : 2015 Certified'),
  qmsLabel:     e('QMS_LABEL',       'QMS System'),
};

export const bank = {
  accountName: e('BANK_ACCOUNT_NAME', company.name),
  name:        e('BANK_NAME',         'Kotak Mahindra Bank'),
  branch:      e('BANK_BRANCH',       'Parrys Chennai'),
  account:     e('BANK_ACCOUNT',      '5811128721'),
  ifsc:        e('BANK_IFSC',         'KKBK0000464'),
  upiId:       e('BANK_UPI',          ''),
  qrUrl:       e('BANK_QR_URL',       '/QR.jpg'),
};

/** True if bank details have been configured. */
export const hasBankDetails = Boolean(bank.name || bank.account || bank.ifsc);
