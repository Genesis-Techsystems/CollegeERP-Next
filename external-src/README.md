# Angular reference source (full application)

Read-only link to the **entire** legacy **goldcollegeerp_2024_dev3** Angular repository — all feature modules, shared code, models, and services. This is **not** part of the Next.js build and is **not** committed to git.

## Links in this repo

Both paths point at the same full Angular app on disk:

| Path | Use |
|---|---|
| `external-src/angular/` | Short alias (preferred in docs and chat) |
| `external-src/goldcollegeerp_2024_dev3/` | Same tree; matches the desktop folder name |

Default source on this machine: `C:\Users\shrav\Desktop\goldcollegeerp_2024_dev3`

## First-time setup (Windows)

From the repo root:

```powershell
.\external-src\setup-reference.ps1
```

Custom location:

```powershell
.\external-src\setup-reference.ps1 -AngularPath "D:\path\to\goldcollegeerp_2024_dev3"
```

## Full Angular tree (what is linked)

Everything under the Angular project root is available, for example:

```
external-src/angular/
├── src/app/main/
│   ├── apps/          # All feature modules (~129 folders: admin, admission, scholarship, …)
│   ├── common/        # Shared constants, components, pipes
│   ├── models/        # TypeScript models
│   ├── services/      # Shared services
│   ├── pages/         # Top-level pages
│   ├── dialogs/
│   └── utils/
├── src/assets/
├── angular.json
└── package.json
```

Only **scholarship** has been migrated to Next.js so far (`src/app/(pages)/(protected)/scholarship-management/`). All other modules still exist only under `external-src/angular/src/app/main/apps/`.

## Path mapping (Angular → Next.js)

| Angular | Next.js |
|---|---|
| `src/app/main/common/` | `src/common/` |
| `src/app/main/common/components/` | `src/common/components/` |
| `src/app/main/apps/<feature>/` | `src/app/(pages)/(protected)/<feature>/` |
| `src/app/main/models/` | `src/types/` |
| `src/app/main/services/` | `src/services/` |

### Scholarship (already migrated)

| Angular | Next.js |
|---|---|
| `src/app/main/apps/scholarship/` | `src/app/(pages)/(protected)/scholarship-management/` |

## IDE / Cursor

- Browse the full app under **`external-src/angular/`** in the file explorer.
- Optional: open **`CollegeERP-Next.code-workspace`** for a two-root workspace (Next.js + Angular reference).
- The linked tree is gitignored; agents should still **read files** from `external-src/angular/` when porting features.

Do **not** import Angular code into the Next.js app.
