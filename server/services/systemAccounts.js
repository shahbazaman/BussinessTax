// server/services/systemAccounts.js
// System account names — must match exactly what's in the DB
export const ACCOUNTS = {
  ACCOUNTS_RECEIVABLE: 'Accounts Receivable',
  SALES_REVENUE:       'Sales Revenue',
  PURCHASE_EXPENSE:    'Purchase / Cost of Goods',
  ACCOUNTS_PAYABLE:    'Accounts Payable',
  BANK_DEFAULT:        'Bank Account',
  SALES_RETURNS:       'Sales Returns',
  PURCHASE_RETURNS:    'Purchase Returns',
};

// Account types for each system account
export const ACCOUNT_TYPES = {
  'Accounts Receivable':        'Asset',
  'Sales Revenue':              'Revenue',
  'Purchase / Cost of Goods':   'Expense',
  'Accounts Payable':           'Liability',
  'Bank Account':               'Asset',
  'Sales Returns':              'Revenue',
  'Purchase Returns':           'Expense',
};