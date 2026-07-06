import type { ProfileField } from './profile-utils'

export function ProfileFieldGrid({ fields }: { readonly fields: ProfileField[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {fields.map((field) => (
        <div key={field.label} className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{field.label}</p>
          <p className="mt-0.5 text-sm text-foreground break-words">{field.value}</p>
        </div>
      ))}
    </div>
  )
}
