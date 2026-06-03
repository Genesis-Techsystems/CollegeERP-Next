export type LibraryRouteKind = 'master' | 'transaction' | 'report' | 'dashboard' | 'placeholder'

export type LibraryRouteConfig = {
  slug: string
  title: string
  description: string
  kind: LibraryRouteKind
}

/** Angular `library.module.ts` child routes → Next.js `/library/{slug}`. */
export const LIBRARY_ROUTES: LibraryRouteConfig[] = [
  { slug: 'library-dashboard', title: 'Library Dashboard', description: 'Overview of library operations and usage.', kind: 'dashboard' },
  { slug: 'library-details', title: 'Library Details', description: 'Register libraries linked to campus, college, and room.', kind: 'master' },
  { slug: 'membership', title: 'Membership', description: 'Manage library memberships for students and staff.', kind: 'transaction' },
  { slug: 'supplier-details', title: 'Supplier Details', description: 'Maintain book suppliers and contact information.', kind: 'master' },
  { slug: 'book-department', title: 'Book Department', description: 'Map book departments to library categories.', kind: 'master' },
  { slug: 'department-details', title: 'Department Details', description: 'Library category and department barcode setup.', kind: 'master' },
  { slug: 'author', title: 'Author', description: 'Authors linked to organization and library.', kind: 'master' },
  { slug: 'publisher', title: 'Publisher', description: 'Book publishers for each library.', kind: 'master' },
  { slug: 'rack', title: 'Rack / Shelve', description: 'Shelving capacity and location within the library.', kind: 'master' },
  { slug: 'books', title: 'Books', description: 'Book catalogue and stock.', kind: 'transaction' },
  { slug: 'add-books', title: 'Add Books', description: 'Add new titles to the catalogue.', kind: 'transaction' },
  {
    slug: 'add-more-books',
    title: 'Add New Books',
    description: 'Add additional copies and purchase details for an existing title.',
    kind: 'transaction',
  },
  { slug: 'book-details', title: 'Book Details', description: 'Detailed book metadata and copies.', kind: 'transaction' },
  { slug: 'periodicals', title: 'Periodicals', description: 'Periodical subscriptions and issues.', kind: 'transaction' },
  { slug: 'add-periodicals', title: 'Add Periodicals', description: 'Register new periodical titles.', kind: 'transaction' },
  { slug: 'add-more-periodicals', title: 'Add More Periodicals', description: 'Add issues or copies for periodicals.', kind: 'transaction' },
  { slug: 'periodical-details', title: 'Periodical Details', description: 'Periodical issue and binding details.', kind: 'transaction' },
  { slug: 'bookIssue', title: 'Book Issue', description: 'Issue books to library members.', kind: 'transaction' },
  { slug: 'bookReturn', title: 'Book Return', description: 'Return issued books and update member history.', kind: 'transaction' },
  { slug: 'book-submission-reminder', title: 'Book Submission Reminder', description: 'Remind members of pending book returns.', kind: 'transaction' },
  { slug: 'book-purchase', title: 'Book Purchase', description: 'Record book purchases from suppliers.', kind: 'transaction' },
  { slug: 'library-settings', title: 'Library Settings', description: 'Fine rules, issue limits, and library parameters.', kind: 'master' },
  { slug: 'book-return-fines', title: 'Book Return Fines', description: 'Calculate and collect overdue fines.', kind: 'transaction' },
  { slug: 'book-due-list', title: 'Books Due List', description: 'List of books due for return.', kind: 'report' },
  { slug: 'books-search', title: 'Books Search', description: 'Search catalogue by title, author, or barcode.', kind: 'report' },
  { slug: 'reserved-books', title: 'Reserved Books', description: 'Books reserved by members.', kind: 'report' },
  { slug: 'library-fine-collection', title: 'Library Fine Collection', description: 'Fine collection summary report.', kind: 'report' },
  { slug: 'books-list', title: 'Staff Books List', description: 'Books issued to staff members.', kind: 'report' },
  { slug: 'student-books', title: 'Student Books', description: 'Books issued to students.', kind: 'report' },
  { slug: 'print-books-barcodes', title: 'Print Books Barcodes', description: 'Generate and print book barcode labels.', kind: 'transaction' },
  { slug: 'books-barcode', title: 'Books Barcode', description: 'Barcode lookup and assignment.', kind: 'transaction' },
  { slug: 'membership-barcode', title: 'Membership Barcode', description: 'Generate membership barcode labels.', kind: 'transaction' },
  { slug: 'studentwise-books-search', title: 'Student-wise Books Search', description: 'Search issues by student.', kind: 'report' },
  { slug: 'library-register', title: 'Library Register', description: 'Library register and member activity.', kind: 'report' },
]

export const LIBRARY_ROUTE_BY_SLUG = Object.fromEntries(
  LIBRARY_ROUTES.map((route) => [route.slug, route]),
) as Record<string, LibraryRouteConfig>

export function getLibraryRoute(slug: string): LibraryRouteConfig {
  return (
    LIBRARY_ROUTE_BY_SLUG[slug] ?? {
      slug,
      title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      description: 'This library screen is being migrated from the Angular application.',
      kind: 'placeholder',
    }
  )
}
