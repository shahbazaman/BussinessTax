// server/services/systemAccounts.js
// System account names — must match exactly what's in the DB
export const ACCOUNTS = {
  ACCOUNTS_RECEIVABLE: 'Accounts Receivable',
  SALES_REVENUE:       'Sales Revenue',
  PURCHASE_EXPENSE:    'Purchase / Cost of Goods',
  BANK_DEFAULT:        'Bank Account',       // fallback if no account linked
};

// Account types for each system account
export const ACCOUNT_TYPES = {
  'Accounts Receivable':        'Asset',
  'Sales Revenue':              'Revenue',
  'Purchase / Cost of Goods':   'Expense',
  'Bank Account':               'Asset',
  'Accounts Payable':           'Liability',
};