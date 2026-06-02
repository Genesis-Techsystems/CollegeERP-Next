export type FinancePageKind = 'hub' | 'list' | 'report' | 'transaction'

export type FinancePageConfig = {
  slug: string
  title: string
  kind: FinancePageKind
  angularPath: string
}

export const FINANCE_HUB_SECTIONS: {
  title: string
  cards: { label: string; href: string; description?: string }[]
}[] = [
  {
    title: 'Masters',
    cards: [
      { label: 'Accounts', href: '/finance/accounts', description: 'Finance account entities' },
      { label: 'Account Types', href: '/finance/acoounts-types', description: 'Chart of account types' },
      { label: 'Finance Category', href: '/finance/finance-category', description: 'Income/expense categories' },
      { label: 'Finance Sub Category', href: '/finance/finance-subcategory', description: 'Sub-categories' },
      { label: 'Bank Accounts', href: '/finance/bank-accounts', description: 'Bank account master' },
      { label: 'Cheque Book', href: '/finance/check-book', description: 'Cheque book register' },
    ],
  },
  {
    title: 'Transactions & books',
    cards: [
      { label: 'Income & Expenses', href: '/finance/transaction', description: 'Record transactions' },
      { label: 'Journal Book', href: '/finance/journal-book', description: 'Journal register' },
      { label: 'Bank Book', href: '/finance/bank-book', description: 'Bank book' },
      { label: 'Cash Book', href: '/finance/cash-book', description: 'Cash book' },
      { label: 'Days Book Report', href: '/finance/days-book-report', description: 'Daily book report' },
      { label: 'Cheque Issue', href: '/finance/check-issue', description: 'Issue cheques' },
    ],
  },
  {
    title: 'Budget & reports',
    cards: [
      { label: 'Budget Mid Year Estimation', href: '/finance/budget', description: 'Mid-year budget estimations' },
      { label: 'Budget Estimation Report', href: '/finance/budget-estimations', description: 'Budget estimation report' },
      { label: 'Budget Proposal', href: '/finance/budget-proposal', description: 'Budget proposals' },
      { label: 'Budget Approval', href: '/finance/budget-approval', description: 'Approve budgets' },
      { label: 'Finance Reports', href: '/finance/finance-reports', description: 'Finance reports' },
    ],
  },
]

const PAGE_META: Record<string, Omit<FinancePageConfig, 'slug'>> = {
  'finance-dashboard': { title: 'Finance Dashboard', kind: 'hub', angularPath: 'finance/finance-dashboard' },
  accounts: { title: 'Accounts', kind: 'list', angularPath: 'finance/accounts' },
  'acoounts-types': { title: 'Account Types', kind: 'list', angularPath: 'finance/acoounts-types' },
  'finance-category': { title: 'Finance Category', kind: 'list', angularPath: 'finance/finance-category' },
  'finance-subcategory': { title: 'Finance Sub Category', kind: 'list', angularPath: 'finance/finance-subcategory' },
  transaction: { title: 'Income & Expenses', kind: 'transaction', angularPath: 'finance/transaction' },
  'journal-book': { title: 'Journal Book', kind: 'report', angularPath: 'finance/journal-book' },
  'bank-book': { title: 'Bank Book', kind: 'report', angularPath: 'finance/bank-book' },
  'cash-book': { title: 'Cash Book', kind: 'report', angularPath: 'finance/cash-book' },
  budget: { title: 'Budget Mid Year Estimation', kind: 'transaction', angularPath: 'finance/budget' },
  'finance-reports': { title: 'Finance Reports', kind: 'report', angularPath: 'finance/finance-reports' },
  'budget-estimations': { title: 'Budget Estimation Report', kind: 'report', angularPath: 'finance/budget-estimations' },
  'budget-proposal': { title: 'Budget Proposal', kind: 'transaction', angularPath: 'finance/budget-proposal' },
  'days-book-report': { title: 'Days Book Report', kind: 'report', angularPath: 'finance/days-book-report' },
  'budget-approval': { title: 'Budget Approval', kind: 'transaction', angularPath: 'finance/budget-approval' },
  'check-issue': { title: 'Cheque Issue', kind: 'transaction', angularPath: 'finance/check-issue' },
  'bank-accounts': { title: 'Bank Accounts', kind: 'list', angularPath: 'finance/bank-accounts' },
  'check-book': { title: 'Cheque Book', kind: 'list', angularPath: 'finance/check-book' },
}

function titleFromSlug(slug: string): string {
  return slug
    .split('/')
    .pop()!
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getFinanceConfig(slug: string): FinancePageConfig {
  const key = slug.replace(/^\/+|\/+$/g, '')
  if (!key || key === 'finance-dashboard') {
    return {
      slug: key || 'finance-dashboard',
      title: 'Finance Dashboard',
      kind: 'hub',
      angularPath: 'finance/finance-dashboard',
    }
  }
  const meta = PAGE_META[key]
  if (meta) return { slug: key, ...meta }
  return {
    slug: key,
    title: titleFromSlug(key),
    kind: 'list',
    angularPath: `finance/${key}`,
  }
}
