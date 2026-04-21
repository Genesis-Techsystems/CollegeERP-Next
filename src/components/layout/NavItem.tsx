'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  // Dashboard / Core
  LayoutDashboard,
  Home,
  AppWindow,
  LayoutGrid,
  Layers,
  // People / HR
  Users,
  User,
  UserCog,
  UserCheck,
  UserPlus,
  UsersRound,
  Contact,
  BadgeCheck,
  // Academics
  GraduationCap,
  BookOpen,
  BookMarked,
  BookCopy,
  Library,
  LibraryBig,
  School,
  Notebook,
  NotebookPen,
  FlaskConical,
  Microscope,
  // Exams / Assessment
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  FileBadge,
  FilePen,
  FileSearch,
  // Finance / Fees
  Receipt,
  CreditCard,
  Banknote,
  Wallet,
  DollarSign,
  PiggyBank,
  Landmark,
  // Attendance / Biometric
  ScanFace,
  Fingerprint,
  CheckSquare,
  UserRoundCheck,
  // Timetable / Calendar
  CalendarClock,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Calendar,
  Clock,
  // Reports / Analytics
  BarChart3,
  BarChart2,
  TrendingUp,
  PieChart,
  LineChart,
  // Settings / Config
  Settings,
  Settings2,
  SlidersHorizontal,
  Wrench,
  // Communication
  Megaphone,
  Bell,
  BellRing,
  Mail,
  MessageSquare,
  MessageCircle,
  Send,
  // Transport / Location
  Bus,
  Car,
  MapPin,
  Map,
  Navigation,
  // Hostel / Buildings
  Building2,
  Building,
  BedDouble,
  Hotel,
  // Library / Files
  FileUp,
  FolderOpen,
  Folder,
  Download,
  Upload,
  Printer,
  // Admin / Security
  ShieldCheck,
  Shield,
  Lock,
  Key,
  // Actions / Misc
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Star,
  Award,
  Trophy,
  Clipboard,
  List,
  ListChecks,
  Grid3X3,
  Search,
  Filter,
  RefreshCw,
  Edit,
  Trash2,
  Plus,
  Minus,
  Check,
  X,
  Info,
  AlertCircle,
  HelpCircle,
  Tag,
  Tags,
  Hash,
  Link as LinkIcon,
  ExternalLink,
  Image,
  Video,
  Music,
  Globe,
  Wifi,
  Cpu,
  Database,
  Server,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Code,
  Terminal,
  GitBranch,
  Package,
  Box,
  Archive,
  Zap,
  Activity,
  Heart,
  Smile,
  Sun,
  Moon,
  Cloud,
  Wind,
} from 'lucide-react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { useNavigationStore } from '@/store/navigation-store'
import { cn } from '@/lib/utils'
import type { NavItem as NavItemType } from '@/types/navigation'

// ---------------------------------------------------------------------------
// Icon map: Material Icons (single-word) → Lucide React components
// Keys match Angular's mat-icon ligature names exactly (snake_case).
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ElementType> = {
  // ── Dashboard / Core ──────────────────────────────────────────────────────
  dashboard:              LayoutDashboard,
  home:                   Home,
  apps:                   AppWindow,
  grid_view:              LayoutGrid,
  widgets:                LayoutGrid,
  layers:                 Layers,
  menu:                   List,
  view_module:            LayoutGrid,
  view_list:              List,
  view_quilt:             LayoutGrid,

  // ── People / HR ───────────────────────────────────────────────────────────
  people:                 Users,
  group:                  UsersRound,
  groups:                 UsersRound,
  person:                 User,
  person_add:             UserPlus,
  person_outline:         User,
  contacts:               Contact,
  account_circle:         User,
  supervisor_account:     UserCog,
  manage_accounts:        UserCog,
  how_to_reg:             UserCheck,
  badge:                  BadgeCheck,
  assignment_ind:         UserCheck,
  face:                   User,
  emoji_people:           User,

  // ── Academics ─────────────────────────────────────────────────────────────
  school:                 GraduationCap,
  book:                   BookOpen,
  menu_book:              BookOpen,
  book_online:            BookOpen,
  library_books:          LibraryBig,
  local_library:          Library,
  book_marked:            BookMarked,
  auto_stories:           BookCopy,
  class:                  Notebook,
  subject:                Notebook,
  edit_note:              NotebookPen,
  note:                   Notebook,
  notes:                  NotebookPen,
  science:                FlaskConical,
  biotech:                Microscope,
  calculate:              Cpu,
  functions:              Cpu,
  psychology:             Microscope,
  history_edu:            GraduationCap,
  model_training:         GraduationCap,
  cast_for_education:     GraduationCap,
  import_contacts:        BookOpen,
  collections_bookmark:   BookMarked,

  // ── Exams / Assessment ────────────────────────────────────────────────────
  assignment:             ClipboardCheck,
  assignment_turned_in:   FileCheck2,
  assignment_return:      FileText,
  assessment:             FileBadge,
  fact_check:             ListChecks,
  quiz:                   FilePen,
  rule:                   ListChecks,
  task:                   ClipboardList,
  task_alt:               ClipboardCheck,
  checklist:              ListChecks,
  grading:                FilePen,
  rate_review:            FilePen,
  text_snippet:           FileText,
  description:            FileText,
  article:                FileText,
  content_paste:          Clipboard,
  document_scanner:       FileSearch,
  find_in_page:           FileSearch,
  post_add:               FileText,
  summarize:              FileText,
  score:                  Trophy,
  grade:                  Star,
  stars:                  Star,
  emoji_events:           Trophy,
  military_tech:          Award,
  workspace_premium:      Award,
  verified:               BadgeCheck,

  // ── Finance / Fees ────────────────────────────────────────────────────────
  attach_money:           CreditCard,
  money:                  Banknote,
  payment:                Receipt,
  receipt:                Receipt,
  receipt_long:           Receipt,
  credit_card:            CreditCard,
  account_balance:        Landmark,
  account_balance_wallet: Wallet,
  savings:                PiggyBank,
  monetization_on:        DollarSign,
  currency_rupee:         DollarSign,
  currency_exchange:      DollarSign,
  local_atm:              Banknote,
  price_check:            CheckSquare,
  sell:                   Tag,
  price_change:           TrendingUp,
  paid:                   CreditCard,
  request_quote:          FileText,
  point_of_sale:          Landmark,

  // ── Attendance / Biometric ────────────────────────────────────────────────
  attendance:             ScanFace,
  fingerprint:            Fingerprint,
  person_search:          ScanFace,
  how_to_vote:            CheckSquare,
  co_present:             UserRoundCheck,
  present_to_all:         UserRoundCheck,
  group_add:              UserPlus,
  transfer_within_a_station: UserCheck,
  directions_walk:        UserCheck,

  // ── Timetable / Calendar / Schedule ──────────────────────────────────────
  event:                  CalendarClock,
  event_note:             CalendarDays,
  event_available:        CalendarCheck,
  today:                  CalendarDays,
  calendar_today:         CalendarCheck,
  calendar_month:         CalendarDays,
  date_range:             CalendarRange,
  schedule:               Clock,
  alarm:                  Clock,
  timer:                  Clock,
  pending_actions:        Clock,
  watch_later:            Clock,
  history:                RefreshCw,
  update:                 RefreshCw,
  next_plan:              CalendarRange,
  view_timeline:          CalendarRange,

  // ── Reports / Analytics ───────────────────────────────────────────────────
  bar_chart:              BarChart3,
  bar_chart_4_bars:       BarChart2,
  stacked_bar_chart:      BarChart3,
  insert_chart:           BarChart3,
  insert_chart_outlined:  BarChart3,
  area_chart:             LineChart,
  show_chart:             LineChart,
  multiline_chart:        LineChart,
  trending_up:            TrendingUp,
  trending_down:          TrendingUp,
  analytics:              PieChart,
  donut_large:            PieChart,
  pie_chart:              PieChart,
  ssid_chart:             LineChart,
  leaderboard:            BarChart3,
  query_stats:            BarChart3,
  data_usage:             PieChart,
  table_chart:            Grid3X3,
  grid_on:                Grid3X3,
  pivot_table_chart:      Grid3X3,

  // ── Settings / Configuration ──────────────────────────────────────────────
  settings:               Settings2,
  settings_applications:  Settings,
  settings_suggest:       Settings,
  tune:                   SlidersHorizontal,
  build:                  Wrench,
  build_circle:           Wrench,
  handyman:               Wrench,
  admin_panel_settings:   ShieldCheck,
  miscellaneous_services: Settings,
  display_settings:       Settings,
  manage_search:          Search,
  rule_settings:          SlidersHorizontal,
  format_list_bulleted:   List,
  filter_list:            Filter,
  category:               Tag,

  // ── Communication ─────────────────────────────────────────────────────────
  announcement:           Megaphone,
  campaign:               Megaphone,
  notifications:          Bell,
  notifications_active:   BellRing,
  notifications_none:     Bell,
  add_alert:              BellRing,
  email:                  Mail,
  mail:                   Mail,
  inbox:                  Mail,
  mark_email_read:        Mail,
  message:                MessageSquare,
  sms:                    MessageSquare,
  chat:                   MessageCircle,
  chat_bubble:            MessageCircle,
  question_answer:        MessageCircle,
  forum:                  MessageCircle,
  send:                   Send,
  reply:                  Send,
  share:                  ExternalLink,

  // ── Transport / Location ──────────────────────────────────────────────────
  directions_bus:         Bus,
  bus_alert:              Bus,
  airport_shuttle:        Bus,
  local_taxi:             Car,
  drive_eta:              Car,
  directions_car:         Car,
  electric_car:           Car,
  location_on:            MapPin,
  location_city:          Building2,
  map:                    Map,
  navigation:             Navigation,
  near_me:                Navigation,
  place:                  MapPin,
  room:                   MapPin,
  my_location:            MapPin,
  explore:                Globe,
  route:                  Navigation,
  alt_route:              Navigation,
  roundabout_right:       Navigation,
  traffic:                Navigation,

  // ── Hostel / Buildings ────────────────────────────────────────────────────
  hotel:                  BedDouble,
  house:                  Home,
  domain:                 Building2,
  business:               Building,
  apartment:              Building,
  corporate_fare:         Building2,
  foundation:             Building,
  villa:                  Home,
  night_shelter:          Hotel,
  bungalow:               Home,
  bedroom_parent:         BedDouble,
  bedroom_child:          BedDouble,
  king_bed:               BedDouble,
  single_bed:             BedDouble,
  meeting_room:           Building,
  sensor_door:            Building,

  // ── Library / Files / Documents ───────────────────────────────────────────
  upload:                 Upload,
  download:               Download,
  file_upload:            FileUp,
  cloud_upload:           Upload,
  cloud_download:         Download,
  folder:                 Folder,
  folder_open:            FolderOpen,
  folder_shared:          Folder,
  insert_drive_file:      FileText,
  file_copy:              BookCopy,
  copy_all:               BookCopy,
  print:                  Printer,
  local_printshop:        Printer,
  picture_as_pdf:         FileText,
  image:                  Image,
  photo:                  Image,
  collections:            Image,
  video_library:          Video,
  music_note:             Music,
  attachment:             LinkIcon,
  link:                   LinkIcon,
  open_in_new:            ExternalLink,

  // ── Admin / Security / Access ─────────────────────────────────────────────
  security:               Shield,
  verified_user:          ShieldCheck,
  gpp_good:               ShieldCheck,
  lock:                   Lock,
  lock_open:              Lock,
  vpn_key:                Key,
  key:                    Key,
  password:               Key,
  no_encryption:          Lock,
  enhanced_encryption:    ShieldCheck,
  privacy_tip:            ShieldCheck,

  // ── IT / Tech ─────────────────────────────────────────────────────────────
  computer:               Monitor,
  laptop:                 Laptop,
  phone_android:          Smartphone,
  tablet:                 Tablet,
  memory:                 Cpu,
  developer_board:        Cpu,
  storage:                Database,
  dns:                    Server,
  cloud:                  Cloud,
  wifi:                   Wifi,
  code:                   Code,
  terminal:               Terminal,
  integration_instructions: Code,
  developer_mode:         Code,
  api:                    Code,
  data_object:            Database,
  data_array:             Database,
  schema:                 GitBranch,
  source:                 GitBranch,
  inventory:              Package,
  inventory_2:            Box,
  archive:                Archive,
  unarchive:              Archive,

  // ── Misc / General ────────────────────────────────────────────────────────
  info:                   Info,
  info_outline:           Info,
  help:                   HelpCircle,
  help_outline:           HelpCircle,
  warning:                AlertCircle,
  error:                  AlertCircle,
  error_outline:          AlertCircle,
  new_releases:           Zap,
  whatshot:               Zap,
  bolt:                   Zap,
  flash_on:               Zap,
  highlight:              Zap,
  health_and_safety:      Heart,
  favorite:               Heart,
  medical_services:       Heart,
  local_hospital:         Heart,
  sentiment_satisfied:    Smile,
  emoji_emotions:         Smile,
  light_mode:             Sun,
  dark_mode:              Moon,
  wb_sunny:               Sun,
  nights_stay:            Moon,
  air:                    Wind,
  tag:                    Hash,
  label:                  Tag,
  label_important:        Tags,
  new_label:              Tags,
  work:                   Landmark,
  work_outline:           Landmark,
  business_center:        Landmark,
  cases:                  Box,
  move_to_inbox:          Mail,
  outbox:                 Send,
  pending:                Clock,
  done:                   Check,
  done_all:               CheckSquare,
  check_circle:           Check,
  check_box:              CheckSquare,
  close:                  X,
  delete:                 Trash2,
  remove_circle:          Minus,
  add_circle:             Plus,
  edit:                   Edit,
  create:                 Edit,
  search:                 Search,
  star:                   Star,
  star_border:            Star,
  bookmark:               BookMarked,
  bookmark_border:        BookMarked,
  flag:                   Activity,
  arrow_forward:          ArrowRight,
  arrow_forward_ios:      ChevronRight,
  chevron_right:          ChevronRight,
  expand_more:            ChevronDown,
  more_vert:              List,
  more_horiz:             List,
  refresh:                RefreshCw,
  sync:                   RefreshCw,
  autorenew:              RefreshCw,
  swap_horiz:             ArrowRight,
  swap_vert:              ArrowRight,
  compare_arrows:         ArrowRight,
  call_made:              ArrowRight,
  north_east:             ArrowRight,
  open_in_browser:        ExternalLink,
}

// ---------------------------------------------------------------------------
// Multi-word CSS class icon resolver (e.g. "fa fa-graduation-cap")
// Strips fa-/icon- prefix, converts dashes to underscores, looks up ICON_MAP.
// Also tries the dashed form without conversion as a fallback.
// ---------------------------------------------------------------------------

function resolveIcon(name?: string): React.ElementType | null {
  if (!name) return null
  const trimmed = name.trim()
  if (!trimmed) return null

  // Single-word Material icon (most common)
  if (!trimmed.includes(' ')) {
    return ICON_MAP[trimmed] ?? null
  }

  // Multi-word CSS class icon: "fa fa-graduation-cap", "icon-home", etc.
  // Try tokens from right to left (last token is usually the most specific)
  const tokens = trimmed.split(/\s+/)
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i]
    // Strip common prefixes
    const stripped = token.replace(/^fa-/, '').replace(/^icon-/, '').replace(/^glyphicon-/, '')
    // Try underscore form ("graduation-cap" → "graduation_cap")
    const underscored = stripped.replace(/-/g, '_')
    if (ICON_MAP[underscored]) return ICON_MAP[underscored]
    // Try dashed form as-is ("bar_chart" stored with dashes)
    if (ICON_MAP[stripped]) return ICON_MAP[stripped]
    // Try without any transformation
    if (ICON_MAP[token]) return ICON_MAP[token]
  }

  return null
}

// ---------------------------------------------------------------------------
// NavIcon sub-component
// kind='module' → fallback LayoutDashboard (top-level module)
// kind='page'   → fallback ChevronRight (leaf page)
// ---------------------------------------------------------------------------

function NavIcon({
  name,
  active,
  kind = 'page',
  /** Solid primary background (Exam masters design-system row) */
  primarySurface = false,
}: {
  name?: string
  active?: boolean
  kind?: 'module' | 'page'
  primarySurface?: boolean
}) {
  const resolved = resolveIcon(name)
  const Icon = resolved ?? (kind === 'module' ? LayoutDashboard : ChevronRight)

  return (
    <span
      className={cn(
        'flex items-center justify-center h-[18px] w-[18px] shrink-0 transition-colors duration-150',
        active
          ? primarySurface
            ? 'text-[hsl(var(--primary-foreground))]'
            : 'text-[hsl(var(--sidebar-primary))]'
          : 'text-[hsl(var(--sidebar-foreground))]',
      )}
    >
      <Icon className="h-[13px] w-[13px]" strokeWidth={1.75} aria-hidden="true" />
    </span>
  )
}

// ---------------------------------------------------------------------------
// NavItem component
// ---------------------------------------------------------------------------

interface NavItemProps {
  item: NavItemType
  depth?: number
}

/** Recursively checks if any descendant has an href matching the current pathname. */
function hasActiveDescendant(item: NavItemType, pathname: string): boolean {
  if (!item.children) return false
  return item.children.some(
    (child) =>
      child.href === pathname ||
      (child.href ? pathname.startsWith(child.href + '/') : false) ||
      hasActiveDescendant(child, pathname),
  )
}

const EXAM_MASTERS_PATH = '/admin-examination-management/admin-exam-masters'

/**
 * Admin Exam Masters nav branch — primary-tinted active state. Scoped to this subtree only.
 */
function usesExamMastersDesign(item: NavItemType): boolean {
  if (item.href?.includes(EXAM_MASTERS_PATH)) return true
  if (
    item.id.startsWith('sub_module_') &&
    item.children?.some((c) => c.href?.includes(EXAM_MASTERS_PATH))
  ) {
    return true
  }
  return false
}

function navCollapsibleTriggerClasses(
  examMasters: boolean,
  isChildActive: boolean,
  isSelfActive: boolean,
  isActive: boolean,
): string {
  if (examMasters && isChildActive && !isSelfActive) {
    return cn(
      'text-[hsl(var(--sidebar-foreground-active))]',
      'bg-[hsl(var(--primary))]/12',
      'ring-1 ring-[hsl(var(--primary))]/35',
    )
  }
  if (examMasters && isActive && isSelfActive) {
    return cn(
      'text-[hsl(var(--primary-foreground))]',
      'bg-[hsl(var(--primary))]',
      'shadow-sm',
    )
  }
  if (isChildActive && !isSelfActive) {
    return 'text-[hsl(var(--sidebar-foreground-active))]'
  }
  if (isActive) {
    return cn(
      'text-[hsl(var(--sidebar-primary))]',
      'bg-[hsl(var(--sidebar-active-bg))]',
      'ring-1 ring-[hsl(var(--sidebar-active-border))]',
    )
  }
  return cn(
    'text-[hsl(var(--sidebar-foreground))]',
    'hover:bg-[hsl(var(--sidebar-hover-bg))]',
    'hover:text-[hsl(var(--sidebar-foreground-active))]',
  )
}

function navLeafClasses(examMasters: boolean, isActive: boolean): string {
  if (examMasters && isActive) {
    return cn(
      'text-[hsl(var(--primary-foreground))]',
      'bg-[hsl(var(--primary))]',
      'shadow-sm',
      'hover:bg-[hsl(var(--primary))]',
    )
  }
  if (examMasters) {
    return cn(
      'text-[hsl(var(--sidebar-foreground))]',
      'hover:bg-[hsl(var(--sidebar-hover-bg))] hover:text-[hsl(var(--sidebar-foreground-active))]',
    )
  }
  if (isActive) {
    return cn(
      'text-[hsl(var(--sidebar-primary))]',
      'bg-[hsl(var(--sidebar-active-bg))]',
      'ring-1 ring-[hsl(var(--sidebar-active-border))]',
      'hover:bg-[hsl(var(--sidebar-active-bg))]',
    )
  }
  return cn(
    'text-[hsl(var(--sidebar-foreground))]',
    'hover:bg-[hsl(var(--sidebar-hover-bg))] hover:text-[hsl(var(--sidebar-foreground-active))]',
    'hover:translate-x-0.5',
  )
}

export function NavItem({ item, depth = 0 }: NavItemProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { collapsedItems, toggleCollapsed, isSidebarCollapsed, isSidebarHovered, setSidebarCollapsed } =
    useNavigationStore()

  const hasChildren = item.children && item.children.length > 0

  const labelLower = (item.label ?? '').toLowerCase()
  const preExamBase = '/admin-examination-management/pre-examination'
  const reEvalBase = '/admin-examination-management/re-evaluation'
  const evalProcessBase = '/admin-examination-management/evaluation-process'
  const postExamBase = '/admin-examination-management/post-examination'
  const forcedRoute = (() => {
    if (labelLower.includes('re-evaluation request') || labelLower.includes('reevaluation request')) {
      return `${reEvalBase}/re-evaluation-request`
    }
    if (
      labelLower.includes('re-evaluation fee') ||
      labelLower.includes('reevaluation fee') ||
      labelLower.includes('re-valuation fee')
    ) {
      return `${reEvalBase}/re-evaluation-fee`
    }
    if (labelLower.includes('exam revised marks')) {
      return `${postExamBase}/re-evaluation-marks-entry`
    }
    if (labelLower.includes('re-evaluation assign') || labelLower.includes('reevaluation assign')) {
      return `${evalProcessBase}/re-evaluation-assign`
    }
    if (labelLower.includes('evaluation status tracking')) {
      return `${evalProcessBase}/update-evaluator-answer-papers-status`
    }
    if (labelLower.includes('student exam fee col')) return `${preExamBase}/student-exam-fee-registration`
    if (labelLower.includes('exam scheduling for')) return `${preExamBase}/exam-scheduling-forms`
    if (labelLower.includes('exam register subjec')) return `${preExamBase}/exam-register-subjects`
    if (labelLower.includes('online exam fee regi')) return `${preExamBase}/online-exam-fee-registration`
    if (labelLower.includes('internal exam registr')) return `${preExamBase}/internal-exam-registration-multiple`
    if (labelLower.includes('exam hallticket')) return `${preExamBase}/exam-hallticket`
    if (labelLower.includes('exam subject barcode')) return `${preExamBase}/exam-subject-barcode-generation`
    if (labelLower.includes('exam forms')) return `${preExamBase}/exam-forms`
    if (labelLower.includes('exam invigilator allot')) return `${preExamBase}/invigilator-allotment`
    if (labelLower.includes('additional exam fee')) return `${preExamBase}/additional-exam-fees`
    if (labelLower.includes('exam attendance-wis') || labelLower.includes('exam attendancewis')) {
      return `${preExamBase}/exam-attendancewise-subject-barcode`
    }
    if (labelLower.includes('student exam lab bat')) return `${preExamBase}/student-exam-lab-batches`
    if (labelLower.includes('exam registration ma')) return `${preExamBase}/exam-registration-manual-feeless`
    if (labelLower.includes('college exam timetable view')) return `${preExamBase}/college-exam-timetable-view`
    if (labelLower.includes('complete exam fee registration') || labelLower.includes('complete examfee registration')) {
      return `${preExamBase}/complete-exam-fee-registration`
    }
    if (labelLower.includes('exam center barcode')) {
      return '/admin-examination-management/exam-papers-delivery-process/exam-center-barcodes'
    }
    if (labelLower.includes('moderation rule setup')) {
      return '/admin-examination-management/result-processing/moderation-rule-setup'
    }
    if (labelLower.includes('grade rule settings') || labelLower.includes('grade rule setup')) {
      return '/admin-examination-management/result-processing/grade-rule-settings'
    }
    if (labelLower.includes('apply moderation rule')) {
      return '/admin-examination-management/result-processing/apply-moderation-rule'
    }
    if (labelLower.includes('t-sheets') || labelLower.includes('t sheets') || labelLower.includes('t-sheet')) {
      return '/admin-examination-management/result-processing/t-sheets'
    }
    if (labelLower.includes('verify exam marks') || labelLower.includes('verify exam status')) {
      return '/admin-examination-management/admin-post-examination/verify-exam-marks'
    }
    if (labelLower.includes('answer paper bag')) {
      return '/admin-examination-management/exam-papers-delivery-process/univ-exam-answer-paper-bags'
    }
    if (labelLower.includes('exam scan profile')) {
      return '/admin-examination-management/exam-papers-delivery-process/exam-scan-profile'
    }
    if (labelLower.includes('scan bundle detail')) {
      return '/admin-examination-management/exam-papers-delivery-process/scan-bundle-details'
    }
    if (labelLower.includes('scan bundles') || labelLower.includes('exam scan bundle')) {
      return '/admin-examination-management/exam-papers-delivery-process/scan-bundles'
    }
    if (labelLower.includes('student re-admission') || labelLower.includes('student readmission')) {
      return '/admin-student-information-system/student-re-admission'
    }
    if (labelLower.includes('readmission application') || labelLower.includes('re-admission application')) {
      return '/admin-student-information-system/readmission-application'
    }
    if (labelLower.includes('student discontinue')) {
      return '/admin-student-information-system/student-discontinue'
    }
    if (labelLower.includes('student passout') || labelLower.includes('students passout')) {
      return '/admin-student-information-system/student-passout'
    }
    if (
      labelLower.includes('assign student roll') ||
      labelLower.includes('generate student roll') ||
      labelLower.includes('student roll number')
    ) {
      return '/admin-student-information-system/generate-student-rollno'
    }
    if (labelLower.includes('student subjects') || labelLower.includes('student subject')) {
      return '/admin-student-information-system/student-subjects'
    }
    if (
      labelLower.includes('student co-curriculum activit') ||
      labelLower.includes('student co curricular activit') ||
      labelLower.includes('student cc activit')
    ) {
      return '/admin-student-information-system/student-cc-activities'
    }
    return null
  })()

  const effectiveHref = forcedRoute ?? item.href
  const isSelfActive =
    effectiveHref === pathname || (effectiveHref ? pathname.startsWith(effectiveHref + '/') : false)
  const isChildActive = hasChildren ? hasActiveDescendant(item, pathname) : false
  const isActive = isSelfActive || isChildActive

  const isOpen = isActive ? true : !collapsedItems.has(item.id)

  const examMasters = usesExamMastersDesign(item)

  // True only when sidebar is collapsed AND the mouse is not hovering over it
  const isEffectivelyCollapsed = isSidebarCollapsed && !isSidebarHovered

  /* ── Icon-only mode: only top-level module icons shown ──────────── */
  if (isEffectivelyCollapsed) {
    // Sub-items are hidden — only depth-0 module icons render
    if (depth > 0) return null

    function handleCollapsedClick() {
      // Re-open submenu if user had manually closed it
      if (hasChildren && collapsedItems.has(item.id)) {
        toggleCollapsed(item.id)
      }
      // Permanently expand the sidebar
      setSidebarCollapsed(false)
    }

    return (
      <button
        type="button"
        title={item.label}
        onClick={handleCollapsedClick}
        className={cn(
          'group relative flex w-full items-center justify-center rounded-md py-2 px-1',
          'transition-all duration-150 ease-out',
          isActive
            ? 'text-[hsl(var(--sidebar-primary))] bg-[hsl(var(--sidebar-active-bg))] ring-1 ring-[hsl(var(--sidebar-active-border))]'
            : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-surface))] hover:text-[hsl(var(--sidebar-foreground-active))]',
        )}
      >
        {isActive && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-[hsl(var(--sidebar-primary))]"
            aria-hidden="true"
          />
        )}
        <NavIcon name={item.icon} active={isActive} kind="module" />
      </button>
    )
  }

  /* Indent depth (used in expanded view) */
  // Slightly tighter left indent to match reference and keep items on one line.
  const paddingLeft =
    depth === 0 ? 'pl-2.5' : depth === 1 ? 'pl-6' : depth === 2 ? 'pl-9.5' : 'pl-12'

  const baseLinkClasses = cn(
    'group relative flex items-center gap-2.5 rounded-lg py-2 text-[12px] font-medium',
    'transition-all duration-150 ease-out',
    `pr-3 ${paddingLeft}`,
  )

  /* ── Expanded: parent items (collapsible groups) ─────────────────── */
  if (hasChildren) {
    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleCollapsed(item.id)}>
        <CollapsibleTrigger
          // data attributes let Sidebar's scroll effect target the active parent module
          {...(depth === 0 ? { 'data-nav-module': '', 'data-active': isActive ? 'true' : undefined } : {})}
          onClick={(e) => {
            if (forcedRoute) {
              e.preventDefault()
              e.stopPropagation()
              router.push(forcedRoute)
            }
          }}
          className={cn(
            baseLinkClasses,
            'w-full',
            navCollapsibleTriggerClasses(examMasters, isChildActive, isSelfActive, isActive),
          )}
        >
          {isActive && !examMasters && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-[hsl(var(--sidebar-primary))]"
              aria-hidden="true"
            />
          )}
          <NavIcon
            name={item.icon}
            active={isActive}
            kind={depth === 0 ? 'module' : 'page'}
            primarySurface={examMasters && isActive && isSelfActive}
          />
          <span className="flex-1 text-left leading-none truncate whitespace-nowrap">
            {item.label}
          </span>
          <span
            className={cn(
              'ml-auto shrink-0 text-slate-500 transition-transform duration-200',
              isOpen && 'rotate-90',
            )}
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <ul className="mt-0.5 space-y-0">
            {item.children!
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((child) => (
                <li key={child.id}>
                  <NavItem item={child} depth={depth + 1} />
                </li>
              ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  /* ── Expanded: leaf items ────────────────────────────────────────── */
  return (
    <Link
      href={forcedRoute ?? item.href ?? '#'}
      onClick={(e) => {
        if (forcedRoute) {
          e.preventDefault()
          router.push(forcedRoute)
        }
      }}
      aria-current={isActive ? 'page' : undefined}
      className={cn(baseLinkClasses, navLeafClasses(examMasters, isActive))}
    >
      {isActive && !examMasters && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-[hsl(var(--sidebar-primary))]"
          aria-hidden="true"
        />
      )}
      <NavIcon name={item.icon} active={isActive} kind="page" primarySurface={examMasters && isActive} />
      <span className="flex-1 leading-none truncate whitespace-nowrap">
        {item.label}
      </span>
    </Link>
  )
}
