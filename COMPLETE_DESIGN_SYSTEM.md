# 🎨 Complete Design System — Academy Arc Vision Style

## Stack
- **React** + **TypeScript**
- **Tailwind CSS** (utility-first styling)
- **shadcn/ui** (component library)
- **Lucide React** (icons)
- **Recharts** (charts/graphs)

---

## ⚙️ Setup Instructions

### Step 1 — Create Project
```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
```

### Step 2 — Install Tailwind CSS
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 3 — Install shadcn/ui
```bash
npx shadcn@latest init
```
Choose: Style → **Default** | Base color → **Slate** | CSS variables → **Yes**

### Step 4 — Install All shadcn Components
```bash
npx shadcn@latest add button card badge table tabs dialog input label select textarea avatar dropdown-menu sheet progress separator skeleton tooltip form
```

### Step 5 — Install Additional Packages
```bash
npm install recharts lucide-react react-router-dom react-hook-form @hookform/resolvers zod @tanstack/react-table
```

---

## 🎨 Color Palette (globals.css)

Add to your `src/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}
```

---

## 🗂️ File Structure
```
src/
├── components/
│   ├── ui/                    ← shadcn auto-generated
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── ChartCard.tsx
│   │   └── RecentActivity.tsx
│   ├── tables/
│   │   └── DataTable.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── common/
│       ├── Buttons.tsx
│       ├── Badges.tsx
│       ├── Cards.tsx
│       ├── Modal.tsx
│       └── SampleForm.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── StudentsPage.tsx
│   └── CoursesPage.tsx
├── App.tsx
└── globals.css
```

---

## 🔘 BUTTONS

```tsx
// src/components/common/Buttons.tsx
import { Button } from "@/components/ui/button"
import { Loader2, Plus, Trash2, Edit, Download, ArrowRight } from "lucide-react"

export function ButtonShowcase() {
  return (
    <div className="flex flex-wrap gap-3 p-6">

      {/* Variants */}
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>

      {/* With icons */}
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Add New
      </Button>

      <Button variant="outline">
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>

      <Button>
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      {/* Icon only */}
      <Button size="icon" variant="outline">
        <Edit className="h-4 w-4" />
      </Button>

      <Button size="icon" variant="destructive">
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Loading */}
      <Button disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>

      {/* Sizes */}
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  )
}
```

### Button Variants Reference
| Variant       | Use Case                    |
|---------------|-----------------------------|
| `default`     | Primary actions             |
| `secondary`   | Secondary actions           |
| `outline`     | Bordered, less emphasis     |
| `ghost`       | Minimal / icon buttons      |
| `destructive` | Delete / danger actions     |
| `link`        | Inline text link style      |

### Button Sizes Reference
| Size      | Description         |
|-----------|---------------------|
| `sm`      | Small               |
| `default` | Medium (default)    |
| `lg`      | Large               |
| `icon`    | Square icon button  |

---

## 🃏 CARDS

### 1. Stats / KPI Card
```tsx
// src/components/dashboard/StatsCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, BookOpen, Award, DollarSign } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  change: string
  trend: "up" | "down"
  icon: React.ReactNode
  description?: string
}

export function StatsCard({ title, value, change, trend, icon, description }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {trend === "up"
            ? <TrendingUp className="h-3 w-3 text-green-500" />
            : <TrendingDown className="h-3 w-3 text-red-500" />
          }
          <span className={`text-xs font-medium ${trend === "up" ? "text-green-500" : "text-red-500"}`}>
            {change}
          </span>
          {description && (
            <span className="text-xs text-muted-foreground ml-1">{description}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Row of 4 stat cards — drop this into your dashboard
export function StatsCardsRow() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard title="Total Students" value="4,231" change="+12.5%" trend="up"
        icon={<Users className="h-4 w-4" />} description="from last month" />
      <StatsCard title="Active Courses" value="128" change="+3" trend="up"
        icon={<BookOpen className="h-4 w-4" />} description="new this week" />
      <StatsCard title="Certificates" value="1,840" change="+8.2%" trend="up"
        icon={<Award className="h-4 w-4" />} description="from last month" />
      <StatsCard title="Revenue" value="$24,560" change="-2.4%" trend="down"
        icon={<DollarSign className="h-4 w-4" />} description="from last month" />
    </div>
  )
}
```

### 2. Content / Course Card
```tsx
// src/components/common/ContentCard.tsx
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Clock, Users } from "lucide-react"

interface ContentCardProps {
  title: string
  description: string
  category: string
  duration: string
  students: number
  image?: string
  status?: "active" | "draft" | "archived"
}

export function ContentCard({
  title, description, category, duration, students, image, status = "active"
}: ContentCardProps) {
  const statusColor = {
    active:   "bg-green-100 text-green-700",
    draft:    "bg-yellow-100 text-yellow-700",
    archived: "bg-gray-100 text-gray-700",
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-40 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
        {image
          ? <img src={image} alt={title} className="h-full w-full object-cover" />
          : <BookOpen className="h-12 w-12 text-primary/40" />
        }
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{category}</Badge>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[status]}`}>
            {status}
          </span>
        </div>
        <h3 className="font-semibold text-base mt-2 line-clamp-2">{title}</h3>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{duration}</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{students} students</span>
        </div>
      </CardContent>
      <CardFooter className="pt-2 gap-2">
        <Button variant="outline" size="sm" className="flex-1">View</Button>
        <Button size="sm" className="flex-1">Enroll</Button>
      </CardFooter>
    </Card>
  )
}
```

### 3. Simple Info Card
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function InfoCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Supporting description text goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Your card content here.</p>
      </CardContent>
    </Card>
  )
}
```

---

## 📊 DATATABLE

```bash
npm install @tanstack/react-table
npx shadcn@latest add table
```

```tsx
// src/components/tables/DataTable.tsx
"use client"

import { useState } from "react"
import {
  ColumnDef, ColumnFiltersState, SortingState,
  flexRender, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, useReactTable,
} from "@tanstack/react-table"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────
export type Student = {
  id: string
  name: string
  email: string
  course: string
  status: "active" | "inactive" | "completed"
  progress: number
  joinedDate: string
}

// ── Sample Data ────────────────────────────────────────────────────────────────
export const sampleStudents: Student[] = [
  { id: "1", name: "Alice Johnson", email: "alice@email.com", course: "React Basics",    status: "active",    progress: 75,  joinedDate: "2024-01-15" },
  { id: "2", name: "Bob Smith",     email: "bob@email.com",   course: "TypeScript Pro",  status: "completed", progress: 100, joinedDate: "2024-01-10" },
  { id: "3", name: "Carol White",   email: "carol@email.com", course: "UI/UX Design",    status: "inactive",  progress: 30,  joinedDate: "2024-02-01" },
  { id: "4", name: "David Brown",   email: "david@email.com", course: "Node.js",         status: "active",    progress: 55,  joinedDate: "2024-02-10" },
  { id: "5", name: "Eve Davis",     email: "eve@email.com",   course: "React Basics",    status: "active",    progress: 90,  joinedDate: "2024-02-20" },
  { id: "6", name: "Frank Lee",     email: "frank@email.com", course: "Next.js",         status: "active",    progress: 40,  joinedDate: "2024-03-01" },
  { id: "7", name: "Grace Kim",     email: "grace@email.com", course: "TypeScript Pro",  status: "inactive",  progress: 15,  joinedDate: "2024-03-05" },
]

// ── Column Definitions ─────────────────────────────────────────────────────────
export const columns: ColumnDef<Student>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Name <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.getValue("name")}</p>
        <p className="text-xs text-muted-foreground">{row.original.email}</p>
      </div>
    ),
  },
  {
    accessorKey: "course",
    header: "Course",
    cell: ({ row }) => <Badge variant="secondary">{row.getValue("course")}</Badge>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const colorMap: Record<string, string> = {
        active:    "bg-green-100 text-green-700 border-green-200",
        inactive:  "bg-red-100 text-red-700 border-red-200",
        completed: "bg-blue-100 text-blue-700 border-blue-200",
      }
      return (
        <span className={`text-xs px-2 py-1 rounded-full border font-medium capitalize ${colorMap[status]}`}>
          {status}
        </span>
      )
    },
  },
  {
    accessorKey: "progress",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Progress <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const progress = row.getValue("progress") as number
      return (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>
      )
    },
  },
  {
    accessorKey: "joinedDate",
    header: "Joined",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.getValue("joinedDate")).toLocaleDateString()}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: () => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm">View</Button>
        <Button variant="outline" size="sm">Edit</Button>
      </div>
    ),
  },
]

// ── DataTable Component ────────────────────────────────────────────────────────
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
}

export function DataTable<TData, TValue>({
  columns, data, searchKey = "name", searchPlaceholder = "Search...",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
          onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
          className="pl-9 max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          of {table.getFilteredRowModel().rows.length} entries
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### DataTable Usage
```tsx
import { DataTable, columns, sampleStudents } from "@/components/tables/DataTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function StudentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Students</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={sampleStudents}
          searchKey="name"
          searchPlaceholder="Search students..."
        />
      </CardContent>
    </Card>
  )
}
```

---

## 🏷️ BADGES

```tsx
// src/components/common/Badges.tsx
import { Badge } from "@/components/ui/badge"

export function BadgeShowcase() {
  return (
    <div className="flex flex-wrap gap-2 p-4">

      {/* shadcn variants */}
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="destructive">Destructive</Badge>

      {/* Custom status badges */}
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">Active</span>
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-700">Pending</span>
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">Inactive</span>
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700">In Progress</span>
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700">Premium</span>
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-700">Archived</span>
    </div>
  )
}
```

### Status Badge Helper (reusable)
```tsx
type Status = "active" | "inactive" | "completed" | "pending" | "archived"

const statusStyles: Record<Status, string> = {
  active:    "bg-green-100 text-green-700",
  inactive:  "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
  pending:   "bg-yellow-100 text-yellow-700",
  archived:  "bg-gray-100 text-gray-700",
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusStyles[status]}`}>
      {status}
    </span>
  )
}

// Usage: <StatusBadge status="active" />
```

---

## 📝 FORMS

```bash
npm install react-hook-form @hookform/resolvers zod
npx shadcn@latest add form input label select textarea
```

```tsx
// src/components/common/SampleForm.tsx
"use client"

import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

// ── Validation Schema ──────────────────────────────────────────────────────────
const schema = z.object({
  name:    z.string().min(2, "Name must be at least 2 characters"),
  email:   z.string().email("Invalid email address"),
  course:  z.string().min(1, "Please select a course"),
  role:    z.string().min(1, "Please select a role"),
  notes:   z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ── Component ──────────────────────────────────────────────────────────────────
export function SampleForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", course: "", role: "", notes: "" },
  })

  const onSubmit = (data: FormValues) => {
    console.log("Form data:", data)
    alert("Submitted! Check console.")
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Enroll Student</CardTitle>
        <CardDescription>Fill in the details to enroll a new student.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Name */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Email */}
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="john@example.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Two columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* Course */}
              <FormField control={form.control} name="course" render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="react">React Basics</SelectItem>
                      <SelectItem value="typescript">TypeScript Pro</SelectItem>
                      <SelectItem value="nodejs">Node.js</SelectItem>
                      <SelectItem value="design">UI/UX Design</SelectItem>
                      <SelectItem value="nextjs">Next.js</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Role */}
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="instructor">Instructor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Notes */}
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any additional notes..." rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1"
                onClick={() => form.reset()}>
                Reset
              </Button>
              <Button type="submit" className="flex-1">Submit</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
```

---

## 🪟 MODALS / DIALOGS

```bash
npx shadcn@latest add dialog
```

### 1. Confirmation / Delete Modal
```tsx
// src/components/common/Modal.tsx
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle } from "lucide-react"

export function DeleteConfirmModal({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">Delete</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Delete Record?</DialogTitle>
              <DialogDescription>This action cannot be undone.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will permanently delete this record and all associated data.
          Are you sure you want to continue?
        </p>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Yes, Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 2. Add / Edit Record Modal
```tsx
export function AddStudentModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Add Student</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new student to the platform.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" placeholder="John" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" placeholder="Doe" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="john@example.com" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="course">Course</Label>
            <Input id="course" placeholder="e.g. React Basics" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Add Student</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 3. Info / View Modal
```tsx
export function ViewDetailsModal({ student }: { student: { name: string; email: string; course: string; status: string } }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">View</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Student Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {[
            { label: "Name",   value: student.name },
            { label: "Email",  value: student.email },
            { label: "Course", value: student.course },
            { label: "Status", value: student.status },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline">Close</Button>
          <Button>Edit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🧩 EXTRA COMPONENTS

### Tabs
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"

export function TabsExample() {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="students">Students</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <Card><CardContent className="pt-4">Overview content</CardContent></Card>
      </TabsContent>
      <TabsContent value="students">
        <Card><CardContent className="pt-4">Students content</CardContent></Card>
      </TabsContent>
      <TabsContent value="settings">
        <Card><CardContent className="pt-4">Settings content</CardContent></Card>
      </TabsContent>
    </Tabs>
  )
}
```

### Progress Bars
```tsx
import { Progress } from "@/components/ui/progress"

export function ProgressExample() {
  const items = [
    { label: "React Basics",  value: 75 },
    { label: "TypeScript",    value: 45 },
    { label: "Node.js",       value: 90 },
  ]

  return (
    <div className="space-y-3 max-w-sm">
      {items.map(({ label, value }) => (
        <div key={label}>
          <div className="flex justify-between text-sm mb-1">
            <span>{label}</span>
            <span className="text-muted-foreground">{value}%</span>
          </div>
          <Progress value={value} className="h-2" />
        </div>
      ))}
    </div>
  )
}
```

### Skeleton Loaders
```tsx
import { Skeleton } from "@/components/ui/skeleton"

export function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}
```

---

## 🚀 FULL INSTALL (Run in order)

```bash
# 1. Create project
npm create vite@latest my-app -- --template react-ts
cd my-app

# 2. Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 3. shadcn/ui init
npx shadcn@latest init

# 4. All shadcn components at once
npx shadcn@latest add button card badge table tabs dialog input label select textarea avatar dropdown-menu sheet progress separator skeleton tooltip form

# 5. All other packages
npm install recharts lucide-react react-router-dom react-hook-form @hookform/resolvers zod @tanstack/react-table

# 6. Start dev server
npm run dev
```

---

## 🖥️ DASHBOARD

### 1. Sidebar Component
```tsx
// src/components/layout/Sidebar.tsx
import { useState } from "react"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, BookOpen, Users, Award, Settings,
  ChevronLeft, ChevronRight, GraduationCap, BarChart2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",    href: "/" },
  { icon: BookOpen,        label: "Courses",      href: "/courses" },
  { icon: Users,           label: "Students",     href: "/students" },
  { icon: Award,           label: "Certificates", href: "/certificates" },
  { icon: BarChart2,       label: "Analytics",    href: "/analytics" },
]

const bottomItems = [
  { icon: Settings, label: "Settings", href: "/settings" },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "relative flex flex-col h-screen bg-card border-r transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}>

        {/* Logo */}
        <div className="flex items-center gap-3 p-4 h-16 border-b">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg tracking-tight">ArcVision</span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-2 space-y-1 mt-2">
          {navItems.map(({ icon: Icon, label, href }) => (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <NavLink
                  to={href}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
            </Tooltip>
          ))}
        </nav>

        <Separator />

        {/* Bottom Items */}
        <div className="p-2 space-y-1 mb-2">
          {bottomItems.map(({ icon: Icon, label, href }) => (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <NavLink
                  to={href}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
            </Tooltip>
          ))}
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="outline"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border shadow-sm"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed
            ? <ChevronRight className="h-3 w-3" />
            : <ChevronLeft className="h-3 w-3" />
          }
        </Button>
      </aside>
    </TooltipProvider>
  )
}
```

---

### 2. Header Component
```tsx
// src/components/layout/Header.tsx
import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header() {
  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 gap-4">

      {/* Search bar */}
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search..." className="pl-9 bg-muted/50 border-0" />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">

        {/* Notification bell */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
            3
          </Badge>
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-auto p-1">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatar.jpg" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium leading-none">John Doe</p>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
```

---

### 3. Chart Card (Area Chart)
```tsx
// src/components/dashboard/ChartCard.tsx
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts"

const data = [
  { name: "Jan", students: 400,  revenue: 2400 },
  { name: "Feb", students: 300,  revenue: 1398 },
  { name: "Mar", students: 600,  revenue: 5800 },
  { name: "Apr", students: 800,  revenue: 3908 },
  { name: "May", students: 500,  revenue: 4800 },
  { name: "Jun", students: 900,  revenue: 6800 },
  { name: "Jul", students: 1100, revenue: 8000 },
]

export function ChartCard() {
  const [tab, setTab] = useState("students")
  const [chartType, setChartType] = useState<"area" | "bar">("area")

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between flex-wrap gap-2">
        <div>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Monthly growth trends</CardDescription>
        </div>
        <div className="flex gap-2">
          <Tabs value={chartType} onValueChange={(v) => setChartType(v as "area" | "bar")}>
            <TabsList>
              <TabsTrigger value="area">Area</TabsTrigger>
              <TabsTrigger value="bar">Bar</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          {chartType === "area" ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey={tab}
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorGrad)"
              />
            </AreaChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey={tab} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

---

### 4. Recent Activity Panel
```tsx
// src/components/dashboard/RecentActivity.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const activities = [
  { name: "Alice Johnson", action: "Enrolled in React Basics",  time: "2m ago",  type: "enroll" },
  { name: "Bob Smith",     action: "Completed TypeScript Pro",  time: "1h ago",  type: "complete" },
  { name: "Carol White",   action: "Submitted assignment",      time: "3h ago",  type: "submit" },
  { name: "David Brown",   action: "Joined the platform",       time: "5h ago",  type: "join" },
  { name: "Eve Davis",     action: "Earned a certificate",      time: "1d ago",  type: "award" },
]

const typeColor: Record<string, string> = {
  enroll:   "bg-blue-100 text-blue-700",
  complete: "bg-green-100 text-green-700",
  submit:   "bg-yellow-100 text-yellow-700",
  join:     "bg-purple-100 text-purple-700",
  award:    "bg-orange-100 text-orange-700",
}

export function RecentActivity() {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Recent Activity</CardTitle>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
          View all
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((a, i) => (
          <div key={i} className="flex items-start gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs">
                {a.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{a.name}</p>
              <p className="text-xs text-muted-foreground truncate">{a.action}</p>
            </div>
            <div className="text-right shrink-0 space-y-1">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColor[a.type]}`}>
                {a.type}
              </span>
              <p className="text-xs text-muted-foreground">{a.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
```

---

### 5. Top Courses Table Card
```tsx
// src/components/dashboard/TopCourses.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

const courses = [
  { name: "React Basics",    students: 142, completion: 78, revenue: "$4,200" },
  { name: "TypeScript Pro",  students: 89,  completion: 92, revenue: "$2,800" },
  { name: "Node.js Backend", students: 204, completion: 65, revenue: "$6,100" },
  { name: "UI/UX Design",    students: 67,  completion: 54, revenue: "$2,100" },
  { name: "Next.js",         students: 310, completion: 88, revenue: "$9,400" },
]

export function TopCourses() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Courses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {courses.map((course, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                #{i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium truncate">{course.name}</p>
                  <span className="text-xs text-muted-foreground ml-2">{course.completion}%</span>
                </div>
                <Progress value={course.completion} className="h-1.5" />
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium">{course.revenue}</p>
                <p className="text-xs text-muted-foreground">{course.students} students</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

### 6. Full Dashboard Page (wires everything together)
```tsx
// src/pages/Dashboard.tsx
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { StatsCardsRow } from "@/components/dashboard/StatsCard"
import { ChartCard } from "@/components/dashboard/ChartCard"
import { RecentActivity } from "@/components/dashboard/RecentActivity"
import { TopCourses } from "@/components/dashboard/TopCourses"

export default function Dashboard() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Page heading */}
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Welcome back, John! Here's what's happening.</p>
          </div>

          {/* KPI Stats Row */}
          <StatsCardsRow />

          {/* Chart + Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartCard />
            </div>
            <div>
              <RecentActivity />
            </div>
          </div>

          {/* Top Courses */}
          <TopCourses />

        </main>
      </div>
    </div>
  )
}
```

---

### 7. App.tsx (routing entry point)
```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Dashboard from "@/pages/Dashboard"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {/* Add more routes here */}
        {/* <Route path="/students" element={<StudentsPage />} /> */}
        {/* <Route path="/courses"  element={<CoursesPage />} /> */}
      </Routes>
    </BrowserRouter>
  )
}
```

---

### Dashboard File Checklist
```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx         ✅ collapsible sidebar with nav
│   │   └── Header.tsx          ✅ search + notifications + user menu
│   └── dashboard/
│       ├── StatsCard.tsx       ✅ KPI cards row (from CARDS section)
│       ├── ChartCard.tsx       ✅ area + bar chart with tabs
│       ├── RecentActivity.tsx  ✅ activity feed with avatars
│       └── TopCourses.tsx      ✅ ranked courses with progress bars
└── pages/
    └── Dashboard.tsx           ✅ full page layout
```

---

## 📋 Component Quick Reference

| Component      | Import from                        | shadcn command                    |
|----------------|------------------------------------|-----------------------------------|
| Button         | `@/components/ui/button`           | `add button`                      |
| Card           | `@/components/ui/card`             | `add card`                        |
| Badge          | `@/components/ui/badge`            | `add badge`                       |
| Table          | `@/components/ui/table`            | `add table`                       |
| Dialog/Modal   | `@/components/ui/dialog`           | `add dialog`                      |
| Form           | `@/components/ui/form`             | `add form`                        |
| Input          | `@/components/ui/input`            | `add input`                       |
| Select         | `@/components/ui/select`           | `add select`                      |
| Textarea       | `@/components/ui/textarea`         | `add textarea`                    |
| Tabs           | `@/components/ui/tabs`             | `add tabs`                        |
| Progress       | `@/components/ui/progress`         | `add progress`                    |
| Skeleton       | `@/components/ui/skeleton`         | `add skeleton`                    |
| Avatar         | `@/components/ui/avatar`           | `add avatar`                      |
| Dropdown Menu  | `@/components/ui/dropdown-menu`    | `add dropdown-menu`               |
| DataTable      | `@tanstack/react-table`            | `npm install @tanstack/react-table`|
| Charts         | `recharts`                         | `npm install recharts`            |
| Sidebar        | `@/components/layout/Sidebar`      | custom component                  |
| Header         | `@/components/layout/Header`       | custom component                  |
| ChartCard      | `@/components/dashboard/ChartCard` | custom + recharts                 |
| RecentActivity | `@/components/dashboard/RecentActivity` | custom component             |
| TopCourses     | `@/components/dashboard/TopCourses`| custom component                  |
| Tooltip        | `@/components/ui/tooltip`          | `add tooltip`                     |
| Separator      | `@/components/ui/separator`        | `add separator`                   |
