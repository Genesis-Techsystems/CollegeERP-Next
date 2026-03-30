# College ERP — Next.js

Migration of the College ERP system from Angular 11 to Next.js 16 (App Router). The Spring Boot backend is **frozen** — all changes are frontend only.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, App Router, Turbopack |
| Language | TypeScript 5, React 19 |
| Styling | Tailwind CSS v4 |
| UI Primitives | Radix UI + shadcn/ui |
| Data Table | AG Grid Community v35 |
| Charts | recharts v3 |
| Date Picker | react-day-picker v9 |
| Forms | React Hook Form + Zod |
| Data Fetching | TanStack React Query v5 |
| State | Zustand v5 |
| Auth | iron-session (HTTP-only cookie) |
| Date Utils | date-fns v4 |

---

## Getting Started

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required environment variables

```env
SPRING_API_URL=http://localhost:8080        # Spring Boot base URL (server-side only)
SESSION_SECRET=<32+ character random string> # iron-session encryption key
SESSION_COOKIE_NAME=college_erp_session      # optional, this is the default
NODE_ENV=development                         # 'production' enables Secure cookie flag
```

---

## Architecture

### BFF Proxy Pattern

The browser never talks to Spring Boot directly. All requests go through the Next.js BFF layer:

```
Browser → /api/proxy/{path} → Spring Boot
Browser → /api/auth/login   → iron-session (sets HTTP-only cookie)
```

The proxy validates the session cookie on every request before forwarding to Spring Boot.

### Component Layers

```
src/kit/           ← USE THIS. Canonical component library for all pages.
src/common/        ← DO NOT USE. Frozen Angular-parity layer (reference only).
src/components/    ← DO NOT USE. Legacy components. All moved into kit/.
```

Always import from `@/kit/`. All exports are named exports — never use default imports from kit paths.

### Service Layer

All API calls go through `src/services/`. Pages never call `fetch()` directly.

```ts
// Universal CRUD for Spring Boot domain entities
import { domainList, domainCreate, domainUpdate, domainSoftDelete, buildQuery } from '@/services/crud.service'

// Domain-specific services
import { getExamSessions, createExamSession } from '@/services/exam-session.service'
```

### Constants

Never write a raw URL string in `fetch()`. Use constants from `src/config/constants/api.ts`:

```ts
import { NEXT_API, EXAM_API, AUTH_API } from '@/config/constants/api'

fetch(NEXT_API.AUTH.LOGIN, ...)                        // /api/auth/login
fetch(NEXT_API.PROXY(EXAM_API.UPLOAD_EXAM_NOTIFICATION), ...)  // /api/proxy/examnotificationupload
```

---

## Key Directories

```
src/
├── app/
│   ├── (public)/login/          Login page
│   ├── (protected)/             All authenticated pages (layout enforces auth)
│   └── api/
│       ├── auth/                login / logout / me
│       └── proxy/[...path]/     BFF proxy to Spring Boot
├── kit/                         Canonical component library
├── services/                    API service layer (one file per domain)
├── config/constants/            All constants (API paths, GM codes, app config)
├── types/                       TypeScript interfaces for all entities
├── hooks/                       useSession, useCollegeFilters
├── lib/                         errors, session, utils, navigation
├── store/                       Zustand stores (navigation, theme)
└── context/                     SessionContext
```

---

## Documentation

| File | Contents |
|---|---|
| `PROGRESS.md` | Full changelog — every phase of work, decisions, bugs fixed |
| `ARCHITECTURE_PLAN.md` | Planned improvements (constants, hooks, type fixes) not yet implemented |
| `COMPONENT_AUDIT.md` | Angular vs Next.js component comparison report |
| `CLAUDE.md` | Instructions for AI agents working in this codebase |
