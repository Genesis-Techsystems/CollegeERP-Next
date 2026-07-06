import {
  BookOpen,
  Building2,
  Calendar,
  Clock,
  GraduationCap,
  ScrollText,
  User,
  type LucideIcon,
} from 'lucide-react'

/** Default icons for common filter field labels (case-insensitive match). */
const FILTER_FIELD_ICONS: Record<string, LucideIcon> = {
  university: Building2,
  college: Building2,
  organization: Building2,
  course: GraduationCap,
  regulation: ScrollText,
  'academic year': Calendar,
  'exam group': GraduationCap,
  exam: GraduationCap,
  subject: BookOpen,
  setter: User,
  status: Clock,
  assigned: Calendar,
  date: Calendar,
}

export function filterFieldIcon(label: string): LucideIcon | undefined {
  return FILTER_FIELD_ICONS[label.trim().toLowerCase()]
}
