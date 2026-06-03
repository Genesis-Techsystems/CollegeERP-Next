export function WalletPageLoading() {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      <div className="h-7 w-48 rounded bg-muted" />
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
