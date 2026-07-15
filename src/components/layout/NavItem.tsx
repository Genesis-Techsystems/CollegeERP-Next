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
import { normalizeHref } from '@/lib/navigation'
import {
  mapErpModuleLabelToRoute,
  mapErpModuleNavRoute,
} from '@/lib/erp-modules-navigation'
import {
  isTimetableModuleLabel,
  mapTimetableLabelToRoute,
  mapTimetableNavRoute,
} from '@/lib/timetable-navigation'
import { mapAdminInstitutionalRoomRoute, mapLegacyInstitutionalMastersHref } from '@/lib/admin-institutional-navigation'
import { isHostelModulePath, isHostelRoomAllocationPath, mapHostelNavRoute } from '@/lib/hostel-navigation'
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

function inferIconNameFromLabel(label?: string): string | undefined {
  if (!label) return undefined
  const lower = label.toLowerCase()

  // Specific examination flows
  if (lower.includes('exam masters') || lower.includes('master settings')) return 'settings'
  if (lower.includes('pre examination')) return 'event_note'
  if (lower.includes('evaluation process')) return 'fact_check'
  if (lower.includes('post examination')) return 'assignment_turned_in'
  if (lower.includes('re-evaluation') || lower.includes('reevaluation')) return 'rate_review'
  if (lower.includes('delivery process') || lower.includes('papers delivery')) return 'folder_open'
  if (lower.includes('result processing')) return 'leaderboard'

  // Top-level modules
  if (lower === 'admin' || lower.includes('admin panel') || lower.includes('administration')) return 'admin_panel_settings'
  if (lower.includes('admission')) return 'person_add'
  if (lower.includes('academics') || lower.includes('curriculum')) return 'school'
  if (lower === 'eoffice' || lower.includes('e-office') || lower.includes('e office')) return 'description'
  if (lower.includes('affiliated college') || lower.includes('affiliated')) return 'business'
  if (lower.includes('hr') || lower.includes('human resource') || lower.includes('payroll')) return 'badge'
  if (lower.includes('time-table') || lower.includes('timetable') || lower.includes('time table')) return 'schedule'
  if (lower.includes('student information') || lower.includes('sis')) return 'contacts'
  if (lower.includes('attendance')) return 'task_alt'
  if (lower.includes('account') || lower.includes('fee') || lower.includes('payment') || lower.includes('bank')) return 'account_balance_wallet'
  if (lower.includes('scholarship')) return 'workspace_premium'
  if (lower.includes('mentorship') || lower.includes('mentor')) return 'how_to_reg'
  if (lower.includes('event')) return 'event'
  if (lower.includes('library')) return 'local_library'
  if (lower.includes('hostel') || lower.includes('dormitory')) return 'hotel'
  if (lower.includes('transport') || lower.includes('bus')) return 'directions_bus'
  if (lower.includes('communication') || lower.includes('email') || lower.includes('sms')) return 'mail'
  if (lower.includes('campus maintenance') || lower.includes('maintenance')) return 'build'
  if (lower.includes('inventory') || lower.includes('stock')) return 'inventory'
  if (lower.includes('dashboard')) return 'dashboard'

  // Generic categories
  if (lower.includes('student') || lower.includes('user')) return 'people'
  if (lower.includes('performance') || lower.includes('analytics') || lower.includes('report')) return 'trending_up'
  if (lower.includes('exam') || lower.includes('assessment')) return 'fact_check'
  if (lower.includes('course') || lower.includes('subject') || lower.includes('class')) return 'menu_book'
  if (lower.includes('setting') || lower.includes('config')) return 'settings'
  if (lower.includes('notification') || lower.includes('message')) return 'notifications'
  if (lower.includes('certificate') || lower.includes('document')) return 'description'

  return undefined
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
        'flex items-center justify-center h-[20px] w-[20px] shrink-0 transition-colors duration-150',
        primarySurface && 'text-[hsl(var(--primary-foreground))]',
        !primarySurface && (
          active
            ? 'text-white'
            : kind === 'module'
              ? 'text-[hsl(var(--sidebar-foreground))]'
              : 'text-[hsl(var(--sidebar-foreground))]/80'
        ),
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
    </span>
  )
}

// ---------------------------------------------------------------------------
// NavItem component
// ---------------------------------------------------------------------------

interface NavItemProps {
  item: NavItemType
  depth?: number
  /**
   * Pass `false` until the sidebar layout finishes client mount so nav markup matches SSR.
   * Zustand `persist` can rehydrate `isSidebarCollapsed` before hydration; without this guard
   * the tree flips between expanded links and icon-only buttons and causes hydration errors.
   */
  layoutHydrated?: boolean
}

/** Recursively checks if any descendant has an href matching the current pathname. */
function hasActiveDescendant(item: NavItemType, pathname: string): boolean {
  if (!item.children) return false
  const normPath = normalizeHref(pathname)

  const mapLabelToRoute = (label?: string): string | null => {
    const lower = (label ?? '').toLowerCase()
    if (lower.includes('unit topic bulk upload')) return '/admin/bulk-uploads/unit-topic-bulk-upload'
    if (lower.includes('photos bulk upload') || lower.includes('photo bulk upload')) {
      return '/admin/bulk-uploads/photos-bulk-upload'
    }
    if (lower.includes('temporary staging tables bulk upload') || lower.includes('temparory staging table bulk upload')) {
      return '/admin/bulk-uploads/temporary-staging-tables-bulk-upload'
    }
    if (lower.includes('dost upload') || lower.includes('student dost upload')) {
      return '/admin/bulk-uploads/student-dost-upload'
    }
    if (lower.includes('student bulk upload') || lower.includes('students upload')) {
      return '/admin/bulk-uploads/students-upload'
    }
    if (lower.includes('books bulk upload') || lower.includes('book bulk upload')) {
      return '/admin/bulk-uploads/books-bulk-upload'
    }
    if (lower.includes('send login detail')) {
      return '/email-sms/send-login-details'
    }
    if (
      lower.includes('email log') ||
      lower.includes('email-log') ||
      lower.includes('emaillog') ||
      lower.includes('email logs')
    ) {
      return '/email-sms/email-logs'
    }
    if (
      (lower.includes('principal') && lower.includes('staff') && lower.includes('admin') && lower.includes('email')) ||
      lower.includes('principal-staff-to-admin') ||
      lower.includes('principal and staff to admin')
    ) {
      return '/email-sms/principal-staff-to-admin-email'
    }
    if (
      lower.includes('send email to admin') ||
      lower.includes('principal-to-staff-email') ||
      (lower.includes('email to admin') &&
        !lower.includes('principal') &&
        !lower.includes('staff') &&
        !lower.includes('department'))
    ) {
      return '/email-sms/principal-to-staff-email'
    }
    if (
      lower.includes('staff-to-student-email') ||
      (lower.includes('staff') && lower.includes('student') && lower.includes('email')) ||
      (lower.includes('send email') && lower.includes('student') && !lower.includes('sms') && !lower.includes('login'))
    ) {
      return '/email-sms/staff-to-student-email'
    }
    if (
      lower.includes('depart-wise') ||
      lower.includes('dept-wise') ||
      lower.includes('department-wise-email') ||
      lower.includes('department-wise-emial') ||
      (lower.includes('department') && lower.includes('wise') && lower.includes('email'))
    ) {
      return '/email-sms/department-wise-email'
    }
    if (
      lower.includes('principal-to-dept') ||
      lower.includes('principal-to-dpt') ||
      (lower.includes('send email') &&
        lower.includes('department') &&
        lower.includes('email') &&
        !lower.includes('wise') &&
        !lower.includes('student'))
    ) {
      return '/email-sms/principal-to-dept-email'
    }
    if (
      (lower.includes('absent') || lower.includes('absentee'))
      && (lower.includes('sms') || lower.includes('message'))
    ) {
      return '/email-sms/send-sms-to-absents'
    }
    if (
      lower.includes('staff')
      && lower.includes('sms')
      && (lower.includes('attendance') || lower.includes('not marked') || lower.includes('not taken'))
      && !lower.includes('absent')
      && !lower.includes('absentee')
    ) {
      return '/email-sms/send-sms-to-staff-attendance'
    }
    if (
      (lower.includes('send sms') && lower.includes('student') && !lower.includes('staff') && !lower.includes('absent'))
      || lower.includes('send-student-sms')
      || lower.includes('send sms to student')
    ) {
      return '/email-sms/send-sms-to-students'
    }
    if (
      lower.includes('question bank')
      && !lower.includes('exam question')
      && !lower.includes('question paper')
    ) {
      return '/assessments/question-bank'
    }
    if (lower.includes('room type') || lower === 'room types') return '/admin/room-types'
    if (lower.includes('room details') || lower === 'room detail') return '/admin/room-details'
    if (
      lower.includes('exam') &&
      lower.includes('timetable') &&
      lower.includes('report') &&
      !lower.includes('course year') &&
      !lower.includes('lab')
    ) {
      return '/admin-examination-management/admin-exam-reports/exam-timetable-report'
    }
    if (lower.includes('invigilator') && lower.includes('allot') && lower.includes('report')) {
      return '/admin-examination-management/admin-exam-reports/exam-invigilator-allotment-report'
    }
    if (
      lower.includes('student') &&
      lower.includes('registration') &&
      lower.includes('report') &&
      !lower.includes('timetable')
    ) {
      return '/admin-examination-management/admin-exam-reports/exam-student-registration-report'
    }
    if (lower.includes('summary') && lower.includes('result') && lower.includes('report')) {
      return '/admin-examination-management/admin-exam-reports/student-summary-result-report'
    }
    if (lower.includes('result') && lower.includes('detail') && lower.includes('report')) {
      return '/admin-examination-management/admin-exam-reports/student-result-details-report'
    }
    if (
      lower.includes('batch') &&
      lower.includes('backlog') &&
      lower.includes('report')
    ) {
      return '/admin-examination-management/admin-exam-reports/student-backlog-data'
    }
    if (
      lower.includes('backlog') &&
      lower.includes('report') &&
      lower.includes('student') &&
      !lower.includes('batch')
    ) {
      return '/admin-examination-management/admin-exam-reports/student-backlog-report'
    }
    if (
      lower.includes('credit') &&
      lower.includes('report') &&
      (lower.includes('student') || lower.includes('credits'))
    ) {
      return '/admin-examination-management/admin-exam-reports/student-credits-report'
    }
    if (lower.includes('assignment') && lower.includes('pending')) {
      return '/admin-examination-management/admin-exam-reports/assignment-pending-list-report'
    }
    if (
      lower.includes('moderation') &&
      lower.includes('report') &&
      !lower.includes('benefit') &&
      !lower.includes('jntu') &&
      !lower.includes('rule') &&
      !lower.includes('before') &&
      !lower.includes('after') &&
      !lower.includes('analysis') &&
      !lower.includes('apply')
    ) {
      return '/admin-examination-management/admin-exam-reports/exam-moderation-reports'
    }
    if (
      (lower.includes('grace') && lower.includes('mark') && lower.includes('report')) ||
      (lower.includes('gracemark') && lower.includes('report'))
    ) {
      if (!lower.includes('benefit') && !lower.includes('jntu')) {
        return '/admin-examination-management/admin-exam-reports/exam-gracemarks-reports'
      }
    }
    if (lower.includes('tabulation')) {
      return '/admin-examination-management/admin-exam-reports/tabulation-register'
    }
    if (
      (lower.includes('exam') && lower.includes('result') && lower.includes('sheet')) ||
      (lower.includes('exam') && lower.includes('results') && lower.includes('sheet'))
    ) {
      return '/admin-examination-management/admin-exam-reports/exam-results-sheets'
    }
    if (lower.includes('gradewise') && lower.includes('result')) {
      return '/admin-examination-management/admin-exam-reports/subject-gradewise-result-report'
    }
    if (lower.includes('final') && lower.includes('result') && lower.includes('analysis')) {
      return '/admin-examination-management/admin-exam-reports/final-result-analysis-report'
    }
    if (
      lower.includes('final') &&
      lower.includes('mark') &&
      (lower.includes('pre moderation') || lower.includes('premoderation') || lower.includes('pre-moderation'))
    ) {
      return '/admin-examination-management/admin-exam-reports/final-marks-premoderation'
    }
    if (
      lower.includes('subject') &&
      lower.includes('wise') &&
      lower.includes('result') &&
      !lower.includes('group') &&
      !lower.includes('grade') &&
      !lower.includes('pass percent')
    ) {
      return '/admin-examination-management/admin-exam-reports/subjectwise-result-report'
    }
    if (
      (lower.includes('group') && lower.includes('subject') && lower.includes('result')) ||
      (lower.includes('group') && lower.includes('subjectwise'))
    ) {
      return '/admin-examination-management/admin-exam-reports/group-subjectwise-result-report'
    }
    if (
      (lower.includes('answer') && lower.includes('sheet') && lower.includes('report')) ||
      (lower.includes('exam') && lower.includes('answer') && lower.includes('sheet'))
    ) {
      return '/admin-examination-management/admin-exam-reports/exam-answer-sheets-report'
    }
    const hostel = mapHostelNavRoute(undefined, label)
    if (hostel) return hostel
    const erpModule = mapErpModuleLabelToRoute(label)
    if (erpModule) return erpModule
    const timetable = mapTimetableLabelToRoute(label)
    if (timetable) return timetable
    return null
  }

  return item.children.some((child) => {
    const ch = child.href?.trim()
    const mapped =
      mapAdminInstitutionalRoomRoute(ch, child.label) ??
      mapHostelNavRoute(ch, child.label) ??
      mapErpModuleNavRoute(ch, child.label) ??
      mapLabelToRoute(child.label) ??
      (ch ? mapLegacyMasterSettingsHref(ch) : null) ??
      ch
    if (mapped) {
      const nh = normalizeHref(mapped)
      if (normPath === nh || normPath.startsWith(`${nh}/`)) return true
    }
    return hasActiveDescendant(child, pathname)
  })
}

function findSiblingCollapsibleIds(items: NavItemType[], targetId: string): string[] {
  for (const item of items) {
    const children = item.children ?? []
    if (children.some((child) => child.id === targetId)) {
      return children
        .filter((child) => child.id !== targetId && child.children && child.children.length > 0)
        .map((child) => child.id)
    }
    if (children.length > 0) {
      const nested = findSiblingCollapsibleIds(children, targetId)
      if (nested.length > 0) return nested
    }
  }
  return []
}

const EXAM_MASTERS_PATH = '/admin-examination-management/admin-exam-masters'

/** Sidebar active highlight — same teal as primary / Get List button */
const navActive = {
  text: 'text-[hsl(var(--primary))]',
  textHover: 'hover:text-[hsl(var(--primary))]',
  solid: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]',
  solidHover: 'hover:bg-[hsl(var(--primary))]/90 hover:text-[hsl(var(--primary-foreground))]',
} as const

function mapLegacyMasterSettingsHref(href?: string): string | null {
  if (!href) return null
  const normalized = href.toLowerCase().replace(/\/+$/, '')
  const marker = 'master-settings/'
  const markerIndex = normalized.indexOf(marker)
  if (markerIndex === -1) return null

  const slug = normalized.slice(markerIndex + marker.length)
  if (!slug) return null

  const routeMap: Record<string, string> = {
    banks: '/admin/banks',
    'caste-master': '/admin/caste-master',
    department: '/admin/departments',
    departments: '/admin/departments',
    'sub-reservation-categories': '/admin/reservation-sub-categories',
    'reservation-sub-categories': '/admin/reservation-sub-categories',
    'student-category': '/admin/student-categories',
    'student-categories': '/admin/student-categories',
    'subject-type': '/admin/course-types',
    'subject-types': '/admin/course-types',
    'course-type': '/admin/course-types',
    'course-types': '/admin/course-types',
    'courses-type': '/admin/course-types',
    'courses-types': '/admin/course-types',
    designation: '/admin/designations',
    designations: '/admin/designations',
    'qualification-group': '/admin/qualification-groups',
    'qualification-groups': '/admin/qualification-groups',
    'qualification-groups-master': '/admin/qualification-groups',
    'workflow-stages': '/admin/workflow-stages',
    'workflow-stage': '/admin/workflow-stages',
    'holidays-calendar': '/admin/holidays-calendar',
    'holiday-calendar': '/admin/holidays-calendar',
    'holidays-calender': '/admin/holidays-calendar',
    holidayscalendar: '/admin/holidays-calendar',
    holidaycalendar: '/admin/holidays-calendar',
    holidays: '/admin/holidays-calendar',
    holiday: '/admin/holidays-calendar',
    qualification: '/admin/qualifications',
    qualifications: '/admin/qualifications',
    'designation-master': '/admin/designations',
    'general-settings': '/admin/general-settings',
    'general-master-settings': '/admin/general-master-settings',
    'general-master-setting': '/admin/general-master-settings',
    'general-masters': '/admin/general-master-settings',
    'document-repository': '/admin/document-repository',
    documentrepository: '/admin/document-repository',
    'document-repository-settings': '/admin/document-repository',
    'week-days': '/admin/weekdays',
    weekdays: '/admin/weekdays',
    weekday: '/admin/weekdays',
    'configuration-auto-number': '/admin/configure-auto-numbers',
    'configuration-auto-numbers': '/admin/configure-auto-numbers',
    'configure-auto-number': '/admin/configure-auto-numbers',
    'configure-auto-numbers': '/admin/configure-auto-numbers',
    'config-auto-number': '/admin/configure-auto-numbers',
    'config-autonumber': '/admin/configure-auto-numbers',
    configautonumber: '/admin/configure-auto-numbers',
    'room-details': '/admin/room-details',
    'room-detail': '/admin/room-details',
    roomdetails: '/admin/room-details',
  }

  return routeMap[slug] ?? `/admin/${slug}`
}

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
  _examMasters: boolean,
  isChildActive: boolean,
  isSelfActive: boolean,
  isActive: boolean,
): string {
  if (isSelfActive) {
    // The module page itself is current — soft tint (the left accent bar marks it).
    return cn(
      'text-[hsl(var(--sidebar-foreground-active))]',
      'font-semibold',
      'bg-[hsl(var(--sidebar-primary))]/15',
      'hover:bg-[hsl(var(--sidebar-primary))]/20',
    )
  }
  if (isChildActive) {
    // Ancestor of the active page — keep it light: bright bold text only, no fill.
    // (Stacked solid pills on every ancestor looked heavy/cluttered.)
    return cn(
      'text-[hsl(var(--sidebar-foreground-active))]',
      'font-semibold',
      'bg-transparent',
      'hover:bg-[hsl(var(--sidebar-hover-bg))]',
    )
  }
  if (isActive) {
    return cn(
      'text-[hsl(var(--sidebar-foreground-active))]',
      'bg-transparent',
      'hover:bg-[hsl(var(--sidebar-hover-bg))]',
    )
  }
  return cn(
    'text-[hsl(var(--sidebar-foreground))]',
    'hover:bg-[hsl(var(--sidebar-hover-bg))]',
    'hover:text-[hsl(var(--sidebar-foreground-active))]',
  )
}

/** Leaf row on active: theme-driven pill (`--sidebar-active-bg`) + active foreground.
 *  Never use `--sidebar-primary` as a fill here — some themes (University Blue)
 *  define it as pure white, which made the active row a white pill with white text. */
function navLeafClasses(_examMasters: boolean, isSelfActive: boolean): string {
  if (isSelfActive) {
    return cn(
      'text-[hsl(var(--sidebar-foreground-active))]',
      'font-semibold',
      'bg-[hsl(var(--sidebar-active-bg))]',
      'shadow-sm',
      'hover:brightness-110',
    )
  }
  return cn(
    'text-[hsl(var(--sidebar-foreground))]',
    'hover:bg-[hsl(var(--sidebar-hover-bg))]',
    'hover:text-[hsl(var(--sidebar-foreground-active))]',
  )
}

export function NavItem({ item, depth = 0, layoutHydrated }: NavItemProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { navItems, collapsedItems, toggleCollapsed, isSidebarCollapsed, isSidebarHovered, setSidebarCollapsed } =
    useNavigationStore()

  const hasChildren = item.children && item.children.length > 0
  const showLeftIcon = true
  const hasGenericArrowIcon =
    item.icon === 'arrow_forward' || item.icon === 'arrow_forward_ios' || item.icon === 'chevron_right'
  const inferredIconName = inferIconNameFromLabel(item.label)
  const providedIconIsResolvable = !!item.icon && !!resolveIcon(item.icon)
  const shouldPreferInferredIcon = !providedIconIsResolvable || (depth > 0 && hasGenericArrowIcon)
  const iconName = shouldPreferInferredIcon ? inferredIconName ?? item.icon : item.icon
  // Always show a meaningful icon (backend value, then label inference). The
  // NavIcon component handles the final fallback for leaf pages with no
  // resolvable icon — a subtle dot keeps the icon column rhythm intact.
  const renderedIconName = iconName ?? inferredIconName

  const labelLower = (item.label ?? '').toLowerCase()
  const preExamBase = '/admin-examination-management/pre-examination'
  const reEvalBase = '/admin-examination-management/re-evaluation'
  const evalProcessBase = '/admin-examination-management/evaluation-process'
  const postExamBase = '/admin-examination-management/post-examination'
  const forcedRoute = (() => {
    const hrefLower = (item.href ?? '').toLowerCase()
    const labelKey = labelLower.replace(/[^a-z0-9]+/g, ' ').trim()

    // Exam Results Sheets — pin early (Angular `exam_results_sheets` 404→dashboard otherwise)
    if (
      hrefLower.includes('exam_results_sheets') ||
      hrefLower.includes('exam-results-sheets') ||
      hrefLower.includes('exam-result-sheets') ||
      hrefLower.includes('exam-result-sheet') ||
      hrefLower.includes('exam_result_sheet') ||
      labelKey === 'exam results sheets' ||
      labelKey === 'exam result sheets' ||
      labelKey === 'exam result sheet' ||
      ((labelLower.includes('exam') || labelLower.includes('admin')) &&
        (labelLower.includes('result sheet') || labelLower.includes('results sheet')))
    ) {
      return '/admin-examination-management/admin-exam-reports/exam-results-sheets'
    }

    // Exam Timetable Report (Exam Reports) — must not fall through to Time-Table Management / 404→dashboard
    if (
      hrefLower.includes('exam-timetable-report') ||
      (labelLower.includes('exam') &&
        labelLower.includes('timetable') &&
        labelLower.includes('report') &&
        !labelLower.includes('course year') &&
        !labelLower.includes('lab'))
    ) {
      return '/admin-examination-management/admin-exam-reports/exam-timetable-report'
    }
    // Exam Invigilator Allotment Report (Exam Reports) — not Pre Examination allotment
    if (
      hrefLower.includes('exam-invigilator-allotment-report') ||
      (labelLower.includes('invigilator') &&
        labelLower.includes('allot') &&
        labelLower.includes('report'))
    ) {
      return '/admin-examination-management/admin-exam-reports/exam-invigilator-allotment-report'
    }
    // Exam Student Registration Report (Exam Reports)
    if (
      hrefLower.includes('exam-student-registration-report') ||
      (labelLower.includes('student') &&
        labelLower.includes('registration') &&
        labelLower.includes('report') &&
        !labelLower.includes('timetable') &&
        !labelLower.includes(' tt'))
    ) {
      return '/admin-examination-management/admin-exam-reports/exam-student-registration-report'
    }
    // Student Summary / Details / Backlog result reports
    if (
      hrefLower.includes('student-summary-result-report') ||
      (labelLower.includes('summary') &&
        labelLower.includes('result') &&
        labelLower.includes('report'))
    ) {
      return '/admin-examination-management/admin-exam-reports/student-summary-result-report'
    }
    if (
      hrefLower.includes('student-result-details-report') ||
      (labelLower.includes('result') &&
        labelLower.includes('detail') &&
        labelLower.includes('report'))
    ) {
      return '/admin-examination-management/admin-exam-reports/student-result-details-report'
    }
    if (
      hrefLower.includes('student-backlog-data') ||
      (labelLower.includes('batch') &&
        labelLower.includes('backlog') &&
        labelLower.includes('report'))
    ) {
      // Angular `student-backlog-data` — distinct from Student Backlog Report
      return '/admin-examination-management/admin-exam-reports/student-backlog-data'
    }
    if (
      (hrefLower.includes('student-backlog-report') &&
        !hrefLower.includes('batch') &&
        !hrefLower.includes('student-backlog-data') &&
        !labelLower.includes('batch')) ||
      (labelLower.includes('student') &&
        labelLower.includes('backlog') &&
        labelLower.includes('report') &&
        !labelLower.includes('batch'))
    ) {
      return '/admin-examination-management/admin-exam-reports/student-backlog-report'
    }
    // Student Credits Report
    if (
      hrefLower.includes('student-credits-report') ||
      (labelLower.includes('credit') &&
        labelLower.includes('report') &&
        (labelLower.includes('student') || labelLower.includes('credits')))
    ) {
      return '/admin-examination-management/admin-exam-reports/student-credits-report'
    }
    // Assignment Pending List
    if (
      hrefLower.includes('assignment-pending-list') ||
      (labelLower.includes('assignment') && labelLower.includes('pending'))
    ) {
      return '/admin-examination-management/admin-exam-reports/assignment-pending-list-report'
    }
    // Moderation Reports (Exam Reports) — not rule setup / JNTU / benefitted variants
    if (
      hrefLower.includes('exam-moderation-reports') ||
      (labelLower.includes('moderation') &&
        labelLower.includes('report') &&
        !labelLower.includes('benefit') &&
        !labelLower.includes('jntu') &&
        !labelLower.includes('rule') &&
        !labelLower.includes('before') &&
        !labelLower.includes('after') &&
        !labelLower.includes('analysis') &&
        !labelLower.includes('apply') &&
        !hrefLower.includes('benefited') &&
        !hrefLower.includes('jntu') &&
        !hrefLower.includes('rule'))
    ) {
      return '/admin-examination-management/admin-exam-reports/exam-moderation-reports'
    }
    // Gracemarks Reports
    {
      const isGraceReportLabel =
        ((labelLower.includes('grace') && labelLower.includes('mark') && labelLower.includes('report')) ||
          (labelLower.includes('gracemark') && labelLower.includes('report'))) &&
        !labelLower.includes('benefit') &&
        !labelLower.includes('jntu') &&
        !hrefLower.includes('benefited')
      if (
        hrefLower.includes('exam-gracemarks-reports') ||
        hrefLower.includes('exam-grace-marks-reports') ||
        isGraceReportLabel
      ) {
        return '/admin-examination-management/admin-exam-reports/exam-gracemarks-reports'
      }
    }
    // Tabulation Register (Angular `tabulation_register`)
    if (
      hrefLower.includes('tabulation-register') ||
      hrefLower.includes('tabulation_register') ||
      hrefLower.includes('tabulation-registration') ||
      labelLower.includes('tabulation')
    ) {
      return '/admin-examination-management/admin-exam-reports/tabulation-register'
    }
    // Exam Result Sheets
    if (
      hrefLower.includes('exam-results-sheets') ||
      hrefLower.includes('exam_results_sheets') ||
      hrefLower.includes('exam-result-sheet') ||
      ((labelLower.includes('exam') && labelLower.includes('result') && labelLower.includes('sheet')) ||
        (labelLower.includes('exam') && labelLower.includes('results') && labelLower.includes('sheet')))
    ) {
      return '/admin-examination-management/admin-exam-reports/exam-results-sheets'
    }
    // Gradewise Result Report
    if (
      hrefLower.includes('subject-gradewise-result-report') ||
      hrefLower.includes('gradewise-result') ||
      (labelLower.includes('gradewise') && labelLower.includes('result'))
    ) {
      return '/admin-examination-management/admin-exam-reports/subject-gradewise-result-report'
    }
    // Final Result Analysis Report
    if (
      hrefLower.includes('final-result-analysis-report') ||
      (labelLower.includes('final') &&
        labelLower.includes('result') &&
        labelLower.includes('analysis') &&
        !labelLower.includes('moderation'))
    ) {
      return '/admin-examination-management/admin-exam-reports/final-result-analysis-report'
    }
    // Final Marks Pre Moderation Report
    if (
      hrefLower.includes('final-marks-premoderation') ||
      (labelLower.includes('final') &&
        labelLower.includes('mark') &&
        (labelLower.includes('pre moderation') ||
          labelLower.includes('premoderation') ||
          labelLower.includes('pre-moderation')))
    ) {
      return '/admin-examination-management/admin-exam-reports/final-marks-premoderation'
    }
    // Subject Wise Result Report (not group / gradewise / pass %)
    if (
      hrefLower.includes('subjectwise-result-report') ||
      (labelLower.includes('subject') &&
        labelLower.includes('wise') &&
        labelLower.includes('result') &&
        !labelLower.includes('group') &&
        !labelLower.includes('grade') &&
        !labelLower.includes('pass percent') &&
        !labelLower.includes('evaluator'))
    ) {
      return '/admin-examination-management/admin-exam-reports/subjectwise-result-report'
    }
    // Group & Subject Wise Result Report
    if (
      hrefLower.includes('group-subjectwise-result-report') ||
      (labelLower.includes('group') &&
        labelLower.includes('subject') &&
        labelLower.includes('result') &&
        !labelLower.includes('grade'))
    ) {
      return '/admin-examination-management/admin-exam-reports/group-subjectwise-result-report'
    }
    // Admin Exam Answer Sheets Report
    if (
      hrefLower.includes('exam-answer-sheets-report') ||
      (labelLower.includes('answer') &&
        labelLower.includes('sheet') &&
        (labelLower.includes('report') || labelLower.includes('exam')) &&
        !labelLower.includes('upload') &&
        !labelLower.includes('view'))
    ) {
      return '/admin-examination-management/admin-exam-reports/exam-answer-sheets-report'
    }
    // Legacy Angular hrefs: /reports/admin-exam-reports/... → Next admin-exam-reports pages
    if (hrefLower.includes('/reports/admin-exam-reports/')) {
      const seg = hrefLower.split('/reports/admin-exam-reports/')[1]?.split(/[?#]/)[0]?.replace(/\/+$/, '')
      if (seg) {
        if (seg === 'tabulation_register' || seg === 'tabulation-registration') {
          return '/admin-examination-management/admin-exam-reports/tabulation-register'
        }
        if (seg === 'exam_results_sheets') {
          return '/admin-examination-management/admin-exam-reports/exam-results-sheets'
        }
        return `/admin-examination-management/admin-exam-reports/${seg}`
      }
    }
    if (
      hrefLower.includes('course-year-timetable-report') ||
      (labelLower.includes('course year') && labelLower.includes('timetable') && labelLower.includes('report'))
    ) {
      return '/admin-examination-management/admin-exam-reports/course-year-timetable-report'
    }

    // ── Exam attendance marking ──────────────────────────────────────────────
    // The DB ships both items with href `/attendance-management/mark-attendance`
    // (a placeholder page), so href/label heuristics can't tell them apart or
    // reach the real pages. Pin by the backend page IDs (from the live menu),
    // then fall back to label so other tenants still resolve.
    if (item.id === 'page_100080258') return `${postExamBase}/internal-exam-attendance-marking`
    if (item.id === 'page_100081023') return `${postExamBase}/external-exam-attendance-marking`
    if (
      labelLower.includes('external') &&
      (labelLower.includes('attendance') || labelLower.includes('attendence')) &&
      labelLower.includes('marking')
    ) {
      return `${postExamBase}/external-exam-attendance-marking`
    }
    if (
      labelLower.includes('internal') &&
      (labelLower.includes('attendance') || labelLower.includes('attendence')) &&
      labelLower.includes('marking')
    ) {
      return `${postExamBase}/internal-exam-attendance-marking`
    }
    // Exam Center Subject Attendance (Exam Papers Delivery) — must run BEFORE
    // Exam Attendance-wise Subject Barcode; DB hrefs sometimes reuse
    // `/attendance-management/exam-attendance` for both.
    if (
      hrefLower.includes('exam-center-subject-attendance') ||
      labelLower.includes('examcenter subject attendance') ||
      labelLower.includes('exam center subject attendance') ||
      (labelLower.includes('exam center') &&
        labelLower.includes('subject') &&
        labelLower.includes('attendance') &&
        !labelLower.includes('barcode'))
    ) {
      return '/admin-examination-management/exam-papers-delivery-process/exam-center-subject-attendance'
    }

    // Exam Attendance-wise Subject Barcode — DB href is
    // `/attendance-management/exam-attendance` (placeholder). Pin by page id +
    // href so it always reaches the real pre-examination page. Must run BEFORE
    // the generic "exam subject barcode" rule (that one routes to the plain
    // barcode page on a loose `subject barcode` match).
    // Skip when label is Exam Center Subject Attendance (handled above).
    if (
      !(
        labelLower.includes('exam center') &&
        labelLower.includes('attendance') &&
        !labelLower.includes('barcode')
      ) &&
      (item.id === 'page_100080999' ||
        hrefLower.includes('attendance-management/exam-attendance') ||
        labelLower.includes('exam attendance-wis') ||
        labelLower.includes('exam attendancewis') ||
        (labelLower.includes('attendance') &&
          labelLower.includes('subject') &&
          labelLower.includes('barcode')))
    ) {
      return `${preExamBase}/exam-attendancewise-subject-barcode`
    }

    // Transport — resolve before generic ERP mapper (DB hrefs often duplicate `route`).
    if (!hasChildren) {
      const isMapVehicleRoute =
        (labelLower.includes('map') &&
          (labelLower.includes('vechicle') || labelLower.includes('vehicle')) &&
          labelLower.includes('route') &&
          !labelLower.includes('driver') &&
          !labelLower.includes('stop')) ||
        hrefLower.includes('vehicle-map')
      if (isMapVehicleRoute) return '/transport/vehicle-map'

      const isAddRoute =
        labelLower === 'add route' ||
        (labelLower.includes('add') &&
          labelLower.includes('route') &&
          !labelLower.includes('map') &&
          !labelLower.includes('stop')) ||
        (hrefLower.includes('/transport/route') &&
          !hrefLower.includes('vehicle-map') &&
          !hrefLower.includes('route-stop'))
      if (isAddRoute) return '/transport/route'

      const isMapVehicleDriver =
        (labelLower.includes('map') &&
          labelLower.includes('vehicle') &&
          labelLower.includes('driver')) ||
        hrefLower.includes('vehicle-driver')
      if (isMapVehicleDriver) return '/transport/vehicle-drivers'

      if (labelLower.includes('transport') && labelLower.includes('distance') && labelLower.includes('fee')) {
        return '/transport/distance-fee'
      }

      // TC & No Due — disambiguate certificate routes (shared Angular certificates module).
      if (
        labelLower.includes('transfer') &&
        labelLower.includes('certificate') &&
        !labelLower.includes('request') &&
        !labelLower.includes('issued') &&
        !labelLower.includes('print')
      ) {
        return '/tc-no-due-approval/transfer-certificate'
      }
      if (
        (labelLower.includes('no') && labelLower.includes('due')) ||
        hrefLower.includes('send-no-due') ||
        hrefLower.includes('nodue')
      ) {
        return '/tc-no-due-approval/send-no-due-approval-request'
      }
      if (labelLower.includes('print') && (labelLower.includes('tc') || hrefLower.includes('printtc'))) {
        return '/tc-no-due-approval/certificate-requests/printTc'
      }
      if (labelLower.includes('issued') && labelLower.includes('certificate')) {
        return '/tc-no-due-approval/certificates-issued-list'
      }
      if (labelLower.includes('certificate') && labelLower.includes('report')) {
        return '/tc-no-due-approval/certificate-request-report'
      }
      if (
        labelLower.includes('certificate') &&
        labelLower.includes('request') &&
        !labelLower.includes('report') &&
        !labelLower.includes('issued')
      ) {
        return '/tc-no-due-approval/certificate-requests'
      }

      if (labelLower.includes('hostel') && labelLower.includes('payment')) {
        return '/accounts-and-fees/fees-collection/hostel-payment'
      }
      if (hrefLower.includes('fees-collection/hostel-payment')) {
        return '/accounts-and-fees/fees-collection/hostel-payment'
      }
      if (
        hrefLower.includes('university-payment-wallet-transactions')
        || hrefLower.includes('university-wallet-transactions')
        || (labelLower.includes('university') && labelLower.includes('payment') && labelLower.includes('wallet') && labelLower.includes('transaction'))
      ) {
        return '/wallet/university-payment-wallet-transactions'
      }
      if (
        hrefLower.includes('university-payment-wallet')
        || hrefLower.includes('univ-payment-wallet')
        || (labelLower.includes('university') && labelLower.includes('payment') && labelLower.includes('wallet'))
      ) {
        return '/wallet/university-payment-wallet'
      }
      const adminInstitutionalRoom = mapAdminInstitutionalRoomRoute(item.href, item.label)
      if (adminInstitutionalRoom) return adminInstitutionalRoom

      // Must run before hostel room mapping — label "Exam Center Rooms" contains "room"
      // and was incorrectly forced to /hostel/rooms.
      const deliveryBase = '/admin-examination-management/exam-papers-delivery-process'
      if (
        hrefLower.includes('univ-exam-center-rooms') ||
        labelLower.includes('university exam center room') ||
        labelLower.includes('univ exam center room') ||
        (labelLower.includes('exam center room') &&
          !labelLower.includes('type') &&
          !labelLower.includes('allot'))
      ) {
        // Angular: exam-papers-delivery-process/univ-exam-center-rooms
        return `${deliveryBase}/univ-exam-center-rooms`
      }
      if (
        hrefLower.includes('exam-center-rooms') &&
        !hrefLower.includes('univ-exam-center-rooms') &&
        !hrefLower.includes('room-type') &&
        !hrefLower.includes('allotment')
      ) {
        return `${deliveryBase}/exam-center-rooms`
      }

      const hostelRoute = mapHostelNavRoute(item.href, item.label)
      if (hostelRoute) return hostelRoute
    }

    // Leaf pages only — parent modules must expand/collapse, not navigate away.
    if (!hasChildren) {
      if (
        (labelLower.includes('company') && labelLower.includes('placement') && labelLower.includes('requirement'))
        || hrefLower.includes('company-placements-requirements')
        || (hrefLower.includes('placement-companies') && hrefLower.includes('placements-achievements'))
      ) {
        return '/placements-achievements/placements/placement-companies'
      }
      if (
        (labelLower.includes('placement') && labelLower.includes('student') && labelLower.includes('list'))
        || hrefLower.includes('placement-registered-studentslist')
        || (hrefLower.includes('placement-registered-list') && hrefLower.includes('placements-achievements'))
      ) {
        return '/placements-achievements/placements/placement-registered-list'
      }
      if (
        (labelLower.includes('broadcast') && labelLower.includes('message'))
        || (hrefLower.includes('placement-broadcast') && hrefLower.includes('placements-achievements'))
      ) {
        return '/placements-achievements/placements/placement-broadcast'
      }
      const erpRoute = mapErpModuleNavRoute(item.href, item.label)
      if (erpRoute) return erpRoute
      const timetableRoute = mapTimetableNavRoute(item.href, item.label)
      if (timetableRoute) return timetableRoute
    }

    const idLower = item.id.toLowerCase()
    if (
      labelLower.includes('general master setting') ||
      labelLower.includes('general master settings') ||
      labelLower.includes('general masters')
    ) {
      return '/admin/general-master-settings'
    }
    if (
      hrefLower.includes('configuration-auto-number') ||
      hrefLower.includes('configuration-auto-numbers') ||
      hrefLower.includes('configure-auto-number') ||
      hrefLower.includes('configure-auto-numbers') ||
      hrefLower.includes('configautonumber') ||
      hrefLower.includes('config-auto-number') ||
      idLower.includes('configuration-auto-number') ||
      idLower.includes('configure-auto-number') ||
      (labelLower.includes('auto') && labelLower.includes('number'))
    ) {
      return '/admin/configure-auto-numbers'
    }
    if (hrefLower.includes('/excel-bulk-uploads/dost-bulk-upload') || hrefLower.includes('dost-bulk-upload')) {
      return '/admin/bulk-uploads/student-dost-upload'
    }
    if (
      hrefLower.includes('/excel-bulk-uploads/student-bulk-upload') ||
      hrefLower.includes('/excel-bulk-uploads/students-upload')
    ) {
      return '/admin/bulk-uploads/students-upload'
    }
    if (hrefLower.includes('/excel-bulk-uploads/employee-bulk-upload') || hrefLower.includes('/excel-bulk-uploads/employee-upload')) {
      return '/admin/bulk-uploads/employee-upload'
    }
    if (hrefLower.includes('/excel-bulk-uploads/subjects-bulk-upload') || hrefLower.includes('/excel-bulk-uploads/subject-bulk-upload')) {
      return '/admin/bulk-uploads/subjects-bulk-upload'
    }
    if (hrefLower.includes('/excel-bulk-uploads/books-bulk-upload') || hrefLower.includes('/excel-bulk-uploads/book-bulk-upload')) {
      return '/admin/bulk-uploads/books-bulk-upload'
    }
    if (hrefLower.includes('/excel-bulk-uploads/unit-topic-bulk-upload')) {
      return '/admin/bulk-uploads/unit-topic-bulk-upload'
    }
    if (hrefLower.includes('/excel-bulk-uploads/photos-bulk-upload')) {
      return '/admin/bulk-uploads/photos-bulk-upload'
    }
    if (
      hrefLower.includes('/excel-bulk-uploads/temporary-staging-tables-bulk-upload') ||
      hrefLower.includes('/excel-bulk-uploads/temparory-staging-table-bulk-upload')
    ) {
      return '/admin/bulk-uploads/temporary-staging-tables-bulk-upload'
    }
    if (
      hrefLower.includes('send-student-sms') ||
      hrefLower.includes('send-sms-to-student') ||
      (labelLower.includes('send sms') && labelLower.includes('student') && !labelLower.includes('staff') && !labelLower.includes('absent'))
    ) {
      return '/email-sms/send-sms-to-students'
    }
    if (
      hrefLower.includes('send-absent-sms') ||
      hrefLower.includes('send-sms-to-absent') ||
      ((labelLower.includes('absent') || labelLower.includes('absentee')) && labelLower.includes('sms'))
    ) {
      return '/email-sms/send-sms-to-absents'
    }
    if (
      hrefLower.includes('send-staff-sms') ||
      hrefLower.includes('send-sms-to-staff-attendance') ||
      (labelLower.includes('staff') &&
        labelLower.includes('sms') &&
        (labelLower.includes('attendance') || labelLower.includes('not marked') || labelLower.includes('not taken')))
    ) {
      return '/email-sms/send-sms-to-staff-attendance'
    }
    if (hrefLower.includes('send-login-detail') || labelLower.includes('send login detail')) {
      return '/email-sms/send-login-details'
    }
    if (
      hrefLower.includes('email-log') ||
      hrefLower.includes('emaillog') ||
      labelLower.includes('email log') ||
      labelLower.includes('email logs')
    ) {
      return '/email-sms/email-logs'
    }
    if (
      hrefLower.includes('principal-staff-to-admin-email') ||
      hrefLower.includes('principal-staff-to-admin') ||
      hrefLower.includes('principal-and-staff-to-admin') ||
      (labelLower.includes('principal') &&
        labelLower.includes('staff') &&
        labelLower.includes('admin') &&
        labelLower.includes('email'))
    ) {
      return '/email-sms/principal-staff-to-admin-email'
    }
    if (
      hrefLower.includes('principal-to-staff-email') ||
      hrefLower.includes('send-email-to-admin') ||
      labelLower.includes('send email to admin')
    ) {
      return '/email-sms/principal-to-staff-email'
    }
    if (
      hrefLower.includes('staff-to-student-email') ||
      (labelLower.includes('staff') && labelLower.includes('student') && labelLower.includes('email')) ||
      (labelLower.includes('send email') &&
        labelLower.includes('student') &&
        !labelLower.includes('sms') &&
        !labelLower.includes('login'))
    ) {
      return '/email-sms/staff-to-student-email'
    }
    if (
      hrefLower.includes('depart-wise-email') ||
      hrefLower.includes('dept-wise-email') ||
      hrefLower.includes('department-wise-email') ||
      hrefLower.includes('department-wise-emial')
    ) {
      return '/email-sms/department-wise-email'
    }
    if (hrefLower.includes('principal-to-dept-email') || hrefLower.includes('principal-to-dpt-email')) {
      return '/email-sms/principal-to-dept-email'
    }
    if (labelLower.includes('department') && labelLower.includes('wise') && labelLower.includes('email')) {
      return '/email-sms/department-wise-email'
    }
    if (
      (labelLower.includes('principal') &&
        labelLower.includes('department') &&
        labelLower.includes('email') &&
        !labelLower.includes('wise')) ||
      (labelLower.includes('send email') &&
        labelLower.includes('department') &&
        labelLower.includes('email') &&
        !labelLower.includes('wise') &&
        !labelLower.includes('student'))
    ) {
      return '/email-sms/principal-to-dept-email'
    }

    const institutionalRoute = mapLegacyInstitutionalMastersHref(item.href)
    if (institutionalRoute) return institutionalRoute

    const masterSettingsRoute = mapLegacyMasterSettingsHref(item.href)
    if (masterSettingsRoute) return masterSettingsRoute

    if (labelLower.includes('re-evaluation request') || labelLower.includes('reevaluation request')) {
      return `${reEvalBase}/re-evaluation-request`
    }
    // Exam Master — "Exam Re-Valuation Fee Setup" (Angular); not the re-evaluation module student fee screen.
    if (
      labelLower.includes('re-valuation fee setup') ||
      labelLower.includes('revaluation fee setup') ||
      (labelLower.includes('fee setup') &&
        (labelLower.includes('re-valuation') ||
          labelLower.includes('revaluation') ||
          labelLower.includes('re valuation')))
    ) {
      return '/admin-examination-management/admin-exam-masters/re-valuation-fee-setup'
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
    if (labelLower.includes('exam invigilator allot')) {
      if (labelLower.includes('report')) {
        return '/admin-examination-management/admin-exam-reports/exam-invigilator-allotment-report'
      }
      return `${preExamBase}/invigilator-allotment`
    }
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
    if (
      labelLower.includes('examcenter subject attendance') ||
      labelLower.includes('exam center subject attendance') ||
      (labelLower.includes('exam center') &&
        labelLower.includes('subject') &&
        labelLower.includes('attendance') &&
        !labelLower.includes('barcode'))
    ) {
      return '/admin-examination-management/exam-papers-delivery-process/exam-center-subject-attendance'
    }
    if (labelLower.includes('moderation rule setup')) {
      return '/admin-examination-management/result-processing/moderation-rule-setup'
    }
    if (labelLower.includes('grade rule settings') || labelLower.includes('grade rule setup')) {
      return '/admin-examination-management/result-processing/grade-rule-settings'
    }
    if (
      labelLower.includes('grade setup')
      || labelLower.includes('exam grade')
      || hrefLower.includes('grade-setup')
      || hrefLower.includes('exam-grades')
    ) {
      return `${EXAM_MASTERS_PATH}/grade-setup`
    }
    if (labelLower.includes('apply moderation rule')) {
      return '/admin-examination-management/result-processing/apply-moderation-rule'
    }
    if (labelLower.includes('t-sheets') || labelLower.includes('t sheets') || labelLower.includes('t-sheet')) {
      return '/admin-examination-management/result-processing/t-sheets'
    }
    if (labelLower.includes('verify exam marks') || labelLower.includes('verify exam status')) {
      return `${postExamBase}/verify-exam-marks`
    }
    // Attendance marking — match the DB href first (Angular post-examination
    // routes: `exam-attendance-marking` for internal, `external-exam-…` for
    // external); labels vary per tenant (typos, missing "Internal"/"Exam").
    if (
      hrefLower.includes('external-exam-attendance') ||
      (labelLower.includes('external') &&
        (labelLower.includes('attendance') || labelLower.includes('attendence')) &&
        labelLower.includes('marking'))
    ) {
      return `${postExamBase}/external-exam-attendance-marking`
    }
    if (
      (hrefLower.includes('exam-attendance-marking') && !hrefLower.includes('sheet')) ||
      ((labelLower.includes('attendance') || labelLower.includes('attendence')) &&
        labelLower.includes('marking') &&
        labelLower.includes('exam') &&
        !labelLower.includes('staff') &&
        !labelLower.includes('sheet'))
    ) {
      return `${postExamBase}/internal-exam-attendance-marking`
    }
    if (
      labelLower.includes('internal') &&
      (labelLower.includes('exams average') ||
        labelLower.includes('exam average') ||
        labelLower.includes('internal exams avg'))
    ) {
      return `${postExamBase}/internal-exams-average`
    }
    if (
      labelLower.includes('complete exam process') ||
      labelLower.includes('complete examination process')
    ) {
      return `${postExamBase}/complete-exam-process`
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
    // Exam Scan Bundle New / Print — must run before the generic scan-bundles rule
    // (otherwise "Exam Scan Bundle New" also matches `exam scan bundle`).
    if (
      labelLower.includes('exam scan bundle new') ||
      labelLower.includes('exam scan bundles print') ||
      labelLower.includes('scan bundles print') ||
      hrefLower.includes('exam-scan-bundles-print') ||
      hrefLower.includes('exam-scan-bundle-print')
    ) {
      return '/admin-examination-management/exam-papers-delivery-process/exam-scan-bundles-print'
    }
    if (
      (labelLower.includes('scan bundles') || labelLower.includes('exam scan bundles') || labelLower.includes('exam scan bundle')) &&
      !labelLower.includes('print') &&
      !labelLower.includes('new') &&
      !labelLower.includes('detail')
    ) {
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
    if (
      labelLower.includes('course outcomes') ||
      labelLower.includes('course outcome') ||
      hrefLower.includes('/subject-mapping/course-outcomes')
    ) {
      return '/academics/subject-mapping/course-outcomes'
    }
    if (
      labelLower.includes('allocate student subjects') ||
      labelLower.includes('allocate student subject') ||
      (labelLower.includes('allocate') && labelLower.includes('student') && labelLower.includes('subject')) ||
      hrefLower.includes('/subject-mapping/allocate-student-subject')
    ) {
      return '/academics/subject-mapping/allocate-student-subject'
    }
    const affiliatedBase = '/affiliated-colleges'
    if (
      hrefLower.includes('affiliated-colleges') ||
      hrefLower.includes('/apps/affiliated-colleges') ||
      labelLower.includes('affiliated college')
    ) {
      if (
        hrefLower.includes('assign-student-subjects') ||
        labelLower.includes('assign student subject')
      ) {
        return `${affiliatedBase}/assign-student-subjects`
      }
      if (hrefLower.includes('college-student-subjects')) {
        return `${affiliatedBase}/college-student-subjects`
      }
      if (item.href) {
        const affiliatedHref = normalizeHref(item.href)
        if (affiliatedHref.startsWith(`${affiliatedBase}/`)) return affiliatedHref
      }
    }
    if (
      !hasChildren &&
      (labelLower.includes('timetable dashboard') ||
        (isTimetableModuleLabel(item.label) && !item.children?.length))
    ) {
      return '/time-table-management/timetable-dashboard'
    }
    const hrPayrollBase = '/hr-payroll'
    if (
      hrefLower.includes('hr-payroll') ||
      hrefLower.includes('/apps/hr-payroll') ||
      (labelLower.includes('hr') && labelLower.includes('payroll'))
    ) {
      if (item.href) {
        const hrHref = normalizeHref(item.href)
        const idx = hrHref.indexOf(hrPayrollBase)
        if (idx >= 0) return hrHref.slice(idx)
        if (hrHref.includes('/apps/hr-payroll')) {
          return hrPayrollBase + hrHref.split('/apps/hr-payroll')[1]?.replace(/\/$/, '') || hrPayrollBase
        }
      }
      if (labelLower.includes('hr dashboard')) return `${hrPayrollBase}/hr-dashboard`
      if (labelLower.includes('department head')) return `${hrPayrollBase}/department-heads`
      if (labelLower.includes('payroll category')) return `${hrPayrollBase}/payroll/payroll-category`
      if (labelLower.includes('payroll group')) return `${hrPayrollBase}/payroll/payroll-group`
      if (labelLower.includes('payslip')) return `${hrPayrollBase}/payroll/payslip-for-employees`
      if (labelLower.includes('leave type')) return `${hrPayrollBase}/leave-management/leave-type`
      if (labelLower.includes('employee list')) return `${hrPayrollBase}/employee/employee-list`
    }
    if (
      (labelLower.includes('assign student subject') ||
        labelLower.includes('college student subject')) &&
      !hrefLower.includes('subject-mapping') &&
      !hrefLower.includes('/academics/') &&
      !hrefLower.includes('student-information')
    ) {
      return `${affiliatedBase}/assign-student-subjects`
    }
    if (
      (labelLower.includes('student subjects') || labelLower.includes('student subject')) &&
      !hrefLower.includes('affiliated-colleges')
    ) {
      return '/admin-student-information-system/student-subjects'
    }
    if (labelLower.includes('modify subject group') || labelLower.includes('modify course group')) {
      return '/academics/modify-course-group'
    }
    if (
      labelLower.includes('modify academic batch') ||
      labelLower.includes('modify acadamic batch') ||
      labelLower.includes('modify student batch') ||
      labelLower.includes('modify student batches')
    ) {
      return '/academics/modify-student-batches'
    }
    if (
      labelLower === 'regulations' ||
      hrefLower.includes('/master/regulation') ||
      hrefLower.endsWith('/regulation')
    ) {
      return '/academics/regulations'
    }
    if (
      labelLower.includes('subjects master') ||
      (labelLower === 'subjects' && hrefLower.includes('/master/subjects')) ||
      hrefLower.endsWith('/master/subjects')
    ) {
      return '/academics/subjects'
    }
    if (
      labelLower.includes('university curriculum') ||
      hrefLower.includes('/master/university-currriculum') ||
      hrefLower.includes('/master/university-curriculum')
    ) {
      return '/academics/university-curriculum'
    }
    if (
      labelLower.includes('assign semestr subjects')
      || labelLower.includes('assign semester subjects')
      || hrefLower.includes('/college-curriculum/subject-allocation')
    ) {
      return '/academics/college-curriculum/subject-allocation'
    }
    if (
      labelLower.includes('subject unit topics')
      || labelLower.includes('subject unit topic')
      || labelLower.includes('unit topics')
      || hrefLower.includes('/academics/subject-unit-topics')
      || hrefLower.includes('/subject-unit-topics')
    ) {
      return '/academics/subject-unit-topics'
    }
    if (
      labelLower.includes('subject syllabus plan')
      || labelLower.includes('syllabus plan')
      || hrefLower.includes('/subject-mapping/subject-syllabus-plan')
      || hrefLower.includes('/subject-syllabus-plan')
    ) {
      return '/academics/subject-mapping/subject-syllabus-plan'
    }
    if (
      labelLower.includes('elective group mapping')
      || labelLower.includes('elective-group-mapping')
      || hrefLower.includes('/subject-mapping/elective-group-mapping')
      || hrefLower.includes('/elective-group-mapping')
    ) {
      return '/academics/subject-mapping/elective-group-mapping'
    }
    if (
      labelLower.includes('student enrollment to elective subject')
      || labelLower.includes('student enrolment to elective subject')
      || labelLower.includes('student elective subject enrollment')
      || labelLower.includes('student elective subject enrolment')
      || (
        labelLower.includes('student')
        && labelLower.includes('elective')
        && labelLower.includes('subject')
      )
      || hrefLower.includes('/subject-mapping/student-enrollment-to-elective-subject')
      || hrefLower.includes('/subject-mapping/student-enrolment-to-elective-subject')
      || hrefLower.includes('/subject-mapping/student-enrollment-to-elective-subjects')
      || hrefLower.includes('/subject-mapping/student-enrolment-to-elective-subjects')
      || hrefLower.includes('/student-enrollment-to-elective-subject')
      || hrefLower.includes('/student-enrolment-to-elective-subject')
      || hrefLower.includes('/student-enrollment-to-elective-subjects')
      || hrefLower.includes('/student-enrolment-to-elective-subjects')
    ) {
      return '/academics/subject-mapping/student-enrollment-to-elective-subject'
    }
    if (
      labelLower.includes('assign regulation to students')
      || labelLower.includes('assign regulation for students')
      || labelLower.includes('student regulation assignment')
      || (
        labelLower.includes('assign')
        && labelLower.includes('regulation')
        && labelLower.includes('student')
      )
      || hrefLower.includes('/subject-mapping/assign-regulation-to-students')
      || hrefLower.includes('/assign-regulation-to-students')
    ) {
      return '/academics/subject-mapping/assign-regulation-to-students'
    }
    if (
      labelLower.includes('academic batches of student') ||
      labelLower.includes('academic batches') ||
      labelLower.includes('acadamic batches') ||
      hrefLower.includes('/academics/academic-batches')
    ) {
      return '/academics/academic-batches'
    }
    if (
      labelLower.includes('modify elective batch') ||
      labelLower.includes('modify elective batches') ||
      (labelLower.includes('modify') && labelLower.includes('elective') && labelLower.includes('batch')) ||
      hrefLower.includes('/academics/modify-elective-batches')
    ) {
      return '/academics/modify-elective-batches'
    }
    if (
      labelLower.includes('modify student section') ||
      labelLower.includes('modify students section') ||
      (labelLower.includes('modify') && labelLower.includes('student') && labelLower.includes('section')) ||
      hrefLower.includes('/academics/modify-student-section')
    ) {
      return '/academics/modify-student-section'
    }
    if (
      labelLower.includes('assign students to section')
      || labelLower.includes('assign student to section')
      || labelLower.includes('student section assignment')
      || (
        labelLower.includes('assign')
        && labelLower.includes('student')
        && labelLower.includes('section')
      )
      || hrefLower.includes('/subject-mapping/assign-students-to-section')
      || hrefLower.includes('/assign-students-to-section')
    ) {
      return '/academics/subject-mapping/assign-students-to-section'
    }
    if (
      labelLower.includes('assign students to lab batches')
      || labelLower.includes('assign students to lab batch')
      || labelLower.includes('assign student to lab batches')
      || labelLower.includes('student lab batch assignment')
      || (
        labelLower.includes('assign')
        && labelLower.includes('student')
        && labelLower.includes('lab')
        && labelLower.includes('batch')
      )
      || hrefLower.includes('/subject-mapping/assign-students-to-lab-batches')
      || hrefLower.includes('/assign-students-to-lab-batches')
    ) {
      return '/academics/subject-mapping/assign-students-to-lab-batches'
    }
    if (
      labelLower.includes('assign subject books')
      || labelLower.includes('subject books assign')
      || labelLower.includes('subject book assign')
      || hrefLower.includes('/subject-mapping/assign-subject-books')
      || hrefLower.includes('/subject-mapping/subject-books')
    ) {
      return '/academics/subject-mapping/assign-subject-books'
    }
    if (
      labelLower.includes('add subject units')
      || labelLower.includes('subjects units')
      || labelLower.includes('subject units')
      || hrefLower.includes('/subject-mapping/add-subject-units')
    ) {
      return '/academics/subject-mapping/add-subject-units'
    }
    if (
      labelLower.includes('staff subject unmapping')
      || labelLower.includes('staff subject un-mapping')
      || labelLower.includes('staff subject disassociation')
      || hrefLower.includes('/subject-mapping/staff-subject-unmapping')
      || hrefLower.includes('/subject-mapping/staff-subject-disassociation')
    ) {
      return '/academics/subject-mapping/staff-subject-unmapping'
    }
    if (
      labelLower.includes('staff subject mapping')
      || labelLower.includes('staff subject association')
      || hrefLower.includes('/subject-mapping/course-group-subjects-list')
      || hrefLower.includes('/subject-mapping/staff-subject-mapping')
      || hrefLower.includes('/subject-mapping/staff-subject-association')
    ) {
      return '/academics/subject-mapping/course-group-subjects-list'
    }
    if (
      labelLower.includes('view semester subjects')
      || labelLower.includes('view semestr subjects')
      || (
        hrefLower.includes('/college-curriculum/course-year-subjects')
        && !labelLower.includes('staff subject')
      )
    ) {
      return '/academics/college-curriculum/course-year-subjects'
    }
    if (labelLower === 'college' || labelLower === 'colleges') {
      return '/admin/colleges'
    }
    if (labelLower.includes('academic year')) {
      return '/admin/academic-years'
    }
    if (labelLower.includes('financial year')) {
      return '/admin/financial-years'
    }
    if (
      (labelLower.includes('college courses') && labelLower.includes('group'))
      || (labelLower.includes('college subject') && labelLower.includes('group'))
    ) {
      return '/admin/college-courses-groups'
    }
    if (
      hrefLower.includes('academic-settings/course-type')
      || hrefLower.includes('master-settings/subject-type')
      || hrefLower.includes('master-settings/course-type')
      || hrefLower.endsWith('/course-types')
      || hrefLower.endsWith('/subject-type')
      || hrefLower.endsWith('/course-type')
      || labelLower.includes('subject type')
      || labelLower.includes('subjects type')
      || labelLower.includes('subject types')
      || labelLower.includes('course type')
      || labelLower.includes('course types')
      || labelLower.includes('courses type')
      || labelLower.includes('courses types')
    ) {
      return '/admin/course-types'
    }
    if (labelLower === 'subjects' || labelLower === 'subject' || labelLower === 'course' || labelLower === 'courses') {
      return '/admin/courses'
    }
    if (labelLower.includes('subject group') || labelLower.includes('course group')) {
      return '/admin/course-groups'
    }
    if (labelLower.includes('semister') || labelLower.includes('semester') || labelLower.includes('course year')) {
      return '/admin/course-years'
    }
    if (labelLower === 'sections' || labelLower === 'section') {
      return '/admin/group-sections'
    }
    if (labelLower.includes('student batch')) {
      return '/admin/student-batches'
    }
    if (labelLower === 'batches' || labelLower === 'batch') {
      return '/admin/batches'
    }
    if (labelLower === 'building' || labelLower === 'buildings') {
      return '/admin/buildings'
    }
    if (
      labelLower === 'block' ||
      labelLower === 'blocks' ||
      labelLower.includes(' block ') ||
      labelLower.startsWith('block ') ||
      labelLower.endsWith(' block') ||
      labelLower.startsWith('blocks ') ||
      labelLower.endsWith(' blocks')
    ) {
      return '/admin/blocks'
    }
    if (labelLower === 'floor' || labelLower === 'floors') {
      return '/admin/floors'
    }
    if (labelLower.includes('room type') || labelLower === 'room types') {
      return '/admin/room-types'
    }
    if (labelLower.includes('room details') || labelLower === 'room detail') {
      return '/admin/room-details'
    }
    if (labelLower === 'room' || labelLower === 'rooms') {
      return '/admin/rooms'
    }
    if (labelLower === 'general setting' || labelLower === 'general settings') {
      return '/admin/general-settings'
    }
    if (
      labelLower.includes('general master setting') ||
      labelLower.includes('general master settings') ||
      labelLower.includes('general masters')
    ) {
      return '/admin/general-master-settings'
    }
    if (labelLower === 'designation' || labelLower === 'designations' || labelLower.includes('designation')) {
      return '/admin/designations'
    }
    if (labelLower.includes('qualification group') || labelLower.includes('qualification groups')) {
      return '/admin/qualification-groups'
    }
    if (labelLower.includes('workflow stage') || labelLower.includes('workflow stages')) {
      return '/admin/workflow-stages'
    }
    if (
      labelLower.includes('holiday') ||
      labelLower.includes('holidays') ||
      labelLower.includes('calendar') ||
      labelLower.includes('calender')
    ) {
      return '/admin/holidays-calendar'
    }
    if (labelLower === 'qualification' || labelLower === 'qualifications' || labelLower.includes('qualification')) {
      return '/admin/qualifications'
    }
    if (labelLower.includes('digital online sync')) {
      return '/admin/digital-online-sync'
    }
    if (labelLower.includes('document repository')) {
      return '/admin/document-repository'
    }
    if (labelLower.includes('unit topic bulk upload')) {
      return '/admin/bulk-uploads/unit-topic-bulk-upload'
    }
    if (labelLower.includes('photos bulk upload') || labelLower.includes('photo bulk upload')) {
      return '/admin/bulk-uploads/photos-bulk-upload'
    }
    if (labelLower.includes('temporary staging tables bulk upload') || labelLower.includes('temparory staging table bulk upload')) {
      return '/admin/bulk-uploads/temporary-staging-tables-bulk-upload'
    }
    if (labelLower.includes('dost upload') || labelLower.includes('student dost upload')) {
      return '/admin/bulk-uploads/student-dost-upload'
    }
    if (labelLower.includes('student bulk upload') || labelLower.includes('students upload')) {
      return '/admin/bulk-uploads/students-upload'
    }
    if (labelLower.includes('employee bulk upload') || labelLower.includes('employee upload')) {
      return '/admin/bulk-uploads/employee-upload'
    }
    if (labelLower.includes('subjects bulk upload') || labelLower.includes('subject bulk upload')) {
      return '/admin/bulk-uploads/subjects-bulk-upload'
    }
    if (labelLower.includes('books bulk upload') || labelLower.includes('book bulk upload')) {
      return '/admin/bulk-uploads/books-bulk-upload'
    }
    if (labelLower.includes('week day') || labelLower.includes('weekday') || labelLower.includes('weekdays')) {
      return '/admin/weekdays'
    }
    if (
      labelLower.includes('configure auto number') ||
      labelLower.includes('configuration auto number') ||
      labelLower.includes('auto number configuration') ||
      (labelLower.includes('auto') && labelLower.includes('number'))
    ) {
      return '/admin/configure-auto-numbers'
    }
    if (
      labelLower.includes('student co-curriculum activit') ||
      labelLower.includes('student co curricular activit') ||
      labelLower.includes('student cc activit')
    ) {
      return '/admin-student-information-system/student-cc-activities'
    }
    if (
      labelLower.includes('general user accounts')
      || labelLower.includes('general users accounts')
      || hrefLower.includes('/admin-user-management/general-users-accounts')
      || hrefLower.includes('/admin-user-management/general-user-accounts')
    ) {
      return '/user-management/general-user-accounts'
    }
    if (
      labelLower.includes('staff accounts')
      || labelLower.includes('staff account')
      || hrefLower.includes('/admin-user-management/staff-accounts')
      || hrefLower.includes('/admin-user-management/staff-account')
    ) {
      return '/user-management/staff-accounts'
    }
    if (
      labelLower.includes('examination accounts')
      || labelLower.includes('examination account')
      || labelLower.includes('exam controller account')
      || hrefLower.includes('/admin-user-management/examination-accounts')
      || hrefLower.includes('/admin-user-management/examination-account')
    ) {
      return '/user-management/examination-accounts'
    }
    if (
      labelLower.includes('parent accounts')
      || labelLower.includes('parent account')
      || hrefLower.includes('/admin-user-management/parent-accounts')
      || hrefLower.includes('/admin-user-management/parent/manage')
    ) {
      if (hrefLower.includes('add-sibling')) {
        return '/user-management/parent-accounts/add-sibling'
      }
      if (hrefLower.includes('parent/manage') || labelLower.includes('add parent')) {
        return '/user-management/parent-accounts/manage'
      }
      return '/user-management/parent-accounts'
    }
    if (
      labelLower.includes('student accounts')
      || labelLower.includes('student account')
      || labelLower.includes('add student')
      || hrefLower.includes('/admin-user-management/student-accounts')
      || hrefLower.includes('/admin-user-management/student-account')
      || hrefLower.includes('/admin-user-management/student/manage')
      || hrefLower.includes('/user-management/student/manage')
    ) {
      if (hrefLower.includes('student/manage') || labelLower.includes('add student')) {
        return '/user-management/student-accounts?add=1'
      }
      return '/user-management/student-accounts'
    }
    // Assessments — Question Bank (Angular: `question-bank-list`; module folder `assissments` typo).
    if (
      hrefLower.includes('question-bank-list')
      || hrefLower.includes('/apps/assissments/')
      || (hrefLower.includes('assissments') && hrefLower.includes('question-bank'))
      || (hrefLower.includes('/assessments/question-bank') && !hrefLower.includes('add-question'))
      || (
        labelLower.includes('question bank')
        && !labelLower.includes('exam question')
        && !labelLower.includes('question paper')
        && !hrefLower.includes('admin-examination-management')
        && !hrefLower.includes('evaluation-process')
      )
    ) {
      return '/assessments/question-bank'
    }
    if (hrefLower.includes('/assessments/question-bank/add-question')) {
      return '/assessments/question-bank/add-question'
    }
    if (
      hrefLower.includes('/assessments/test')
      || hrefLower.includes('/apps/assissments/test')
      || (labelLower === 'test' && !hrefLower.includes('question-paper'))
      || labelLower.includes('test list')
    ) {
      return '/assessments/test'
    }
    return null
  })()

  const rawNavTarget = forcedRoute ?? item.href ?? ''
  const canonicalHref =
    rawNavTarget && rawNavTarget !== '#' ? normalizeHref(rawNavTarget) : ''
  const normPathname = normalizeHref(pathname)
  const modulePathActive = (() => {
    const label = (item.label ?? '').toLowerCase().trim()
    if (label === 'admin') return normPathname.startsWith('/admin/')
    if (label === 'academics') return normPathname.startsWith('/academics/')
    if (label.includes('excel bulk uploads') || label.includes('bulk uploads')) {
      return normPathname.startsWith('/admin/bulk-uploads/')
    }
    if (label.includes('affiliated')) return normPathname.startsWith('/affiliated-colleges/')
    if (
      (label.includes('hr') && label.includes('payroll')) ||
      label.includes('hr & payroll') ||
      label.includes('hr and payroll')
    ) {
      return normPathname.startsWith('/hr-payroll/')
    }
    if (
      (label.includes('timetable') && label.includes('management')) ||
      label.includes('time table management') ||
      label.includes('timing set')
    ) {
      return normPathname.startsWith('/time-table-management/')
    }
    if (label.includes('attendance') && label.includes('management')) {
      return normPathname.startsWith('/attendance-management/')
    }
    if (label.includes('mentorship') || (label.includes('counseling') && !label.includes('meeting'))) {
      return normPathname.startsWith('/mentorship/')
    }
    if (label.trim() === 'events' || (label.includes('event') && label.includes('calendar'))) {
      return normPathname.startsWith('/events/')
    }
    if (label.includes('notification') && label.includes('announcement') && !label.includes('my ')) {
      return normPathname.startsWith('/notifications-and-announcements/')
    }
    if (label.includes('my') && label.includes('notification')) {
      return normPathname.startsWith('/my-notifications')
    }
    if (label.includes('student information')) return normPathname.startsWith('/admin-student-information-system/')
    if (label.includes('user management')) return normPathname.startsWith('/user-management/')
    if (label.trim() === 'security') return normPathname.startsWith('/user-management/')
    if ((label.includes('email') && label.includes('sms')) || label.includes('email-sms')) {
      return normPathname.startsWith('/email-sms/')
    }
    const examBase = '/admin-examination-management'
    if (label.includes('examination management')) {
      return normPathname.startsWith(`${examBase}/`)
    }
    if (label.includes('exam masters') || label === 'exam master') {
      return normPathname.startsWith(`${examBase}/admin-exam-masters/`)
    }
    if (label.includes('pre examination') || label.includes('pre-examination')) {
      return normPathname.startsWith(`${examBase}/pre-examination/`)
    }
    if (label.includes('post examination') || label.includes('post-examination')) {
      return normPathname.startsWith(`${examBase}/post-examination/`)
    }
    if (label.includes('evaluation process')) {
      return normPathname.startsWith(`${examBase}/evaluation-process/`)
    }
    if (label.includes('re-evaluation') || label.includes('reevaluation')) {
      return normPathname.startsWith(`${examBase}/re-evaluation/`)
    }
    if (label.includes('exam papers delivery') || label.includes('papers delivery process')) {
      return normPathname.startsWith(`${examBase}/exam-papers-delivery-process/`)
    }
    if (label.includes('result processing')) {
      return normPathname.startsWith(`${examBase}/result-processing/`)
    }
    if (label.includes('assessment')) return normPathname.startsWith('/assessments/')
    if (
      label.trim() === 'library' ||
      (label.includes('library') && !label.includes('fee'))
    ) {
      return normPathname.startsWith('/library/')
    }
    if (label.includes('accounts') && label.includes('fees')) {
      return normPathname.startsWith('/accounts-and-fees/')
    }
    if (label.includes('fee masters')) return normPathname.startsWith('/accounts-and-fees/fee-masters/')
    if (label.includes('fee collection')) return normPathname.startsWith('/accounts-and-fees/fees-collection/')
    if (label.includes('hostel') && label.includes('payment')) {
      return normPathname.startsWith('/accounts-and-fees/fees-collection/hostel-payment')
    }
    if (hasChildren && label.trim() === 'hostel') {
      return isHostelModulePath(normPathname)
    }
    if (hasChildren && label.includes('transport') && !label.includes('fee')) {
      return normPathname.startsWith('/transport/')
    }
    return false
  })()
  const hostelAllocationActive =
    canonicalHref === '/hostel/rooms-list' && isHostelRoomAllocationPath(normPathname)
  const isSelfActive =
    !!canonicalHref &&
    canonicalHref.length > 1 &&
    (normPathname === canonicalHref ||
      normPathname.startsWith(`${canonicalHref}/`) ||
      hostelAllocationActive)
  const isChildActive = (hasChildren ? hasActiveDescendant(item, pathname) : false) || modulePathActive
  const isActive = isSelfActive || isChildActive || modulePathActive

  const isOpen = !collapsedItems.has(item.id)

  const examMasters = usesExamMastersDesign(item)

  // True only when sidebar is collapsed AND the mouse is not hovering over it
  const isEffectivelyCollapsed =
    layoutHydrated === false ? false : isSidebarCollapsed && !isSidebarHovered

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
          'transition-colors duration-150 ease-out',
          isActive
            ? 'text-[hsl(var(--sidebar-foreground-active))] bg-[hsl(var(--sidebar-active-bg))]'
            : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover-bg))] hover:text-[hsl(var(--sidebar-foreground-active))]',
        )}
      >
        {isActive && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r bg-[hsl(var(--sidebar-primary))]"
            aria-hidden="true"
          />
        )}
        <NavIcon name={iconName} active={isActive} kind="module" />
      </button>
    )
  }

  /* Indent depth (used in expanded view) */
  const paddingLeft =
    depth === 0 ? 'pl-2.5' : depth === 1 ? 'pl-7' : depth === 2 ? 'pl-10' : 'pl-12'

  const baseLinkClasses = cn(
    'group relative flex items-center gap-2.5 rounded-md h-10 nav-item font-semibold',
    'transition-colors duration-150 ease-out',
    `pr-3 ${paddingLeft}`,
  )

  /* ── Expanded: parent items (collapsible groups) ─────────────────── */
  if (hasChildren) {
    const handleOpenChange = (open: boolean) => {
      // Accordion behavior at every depth:
      // opening one group closes its sibling groups.
      if (open) {
        const siblingIds =
          depth === 0
            ? navItems
              .filter((topLevelItem) => topLevelItem.id !== item.id && topLevelItem.children?.length)
              .map((topLevelItem) => topLevelItem.id)
            : findSiblingCollapsibleIds(navItems, item.id)

        siblingIds.forEach((siblingId) => {
          if (!collapsedItems.has(siblingId)) {
            toggleCollapsed(siblingId)
          }
        })
      }
      toggleCollapsed(item.id)
    }

    return (
      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger
          // data attributes let Sidebar's scroll effect target the active parent module
          {...(depth === 0 ? { 'data-nav-module': '', 'data-active': isActive ? 'true' : undefined } : {})}
          onClick={(e) => {
            if (forcedRoute && !hasChildren) {
              e.preventDefault()
              e.stopPropagation()
              router.push(normalizeHref(forcedRoute))
            }
          }}
          className={cn(
            baseLinkClasses,
            'w-full',
            navCollapsibleTriggerClasses(examMasters, isChildActive, isSelfActive, isActive),
          )}
        >
          {depth === 0 && isActive && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r bg-[hsl(var(--sidebar-primary))]"
              aria-hidden="true"
            />
          )}
          {showLeftIcon && (
            <NavIcon
              name={renderedIconName}
              active={isSelfActive || isChildActive}
              kind={depth === 0 ? 'module' : 'page'}
            />
          )}
          <span className="flex-1 text-left leading-5 whitespace-normal break-words">
            {item.label}
          </span>
          <span
            className={cn(
              'ml-auto shrink-0 transition-transform duration-200',
              isActive ? 'text-white/80' : 'text-[hsl(var(--sidebar-foreground))]/60',
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
                  <NavItem item={child} depth={depth + 1} layoutHydrated={layoutHydrated} />
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
      href={canonicalHref || rawNavTarget || '#'}
      onClick={(e) => {
        if (forcedRoute) {
          e.preventDefault()
          router.push(normalizeHref(forcedRoute))
        }
      }}
      aria-current={isSelfActive ? 'page' : undefined}
      className={cn(baseLinkClasses, navLeafClasses(examMasters, isSelfActive))}
    >
      {isSelfActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r bg-[hsl(var(--sidebar-primary))]"
          aria-hidden="true"
        />
      )}
      {showLeftIcon && <NavIcon name={renderedIconName} active={isSelfActive} kind="page" />}
      <span className="flex-1 leading-5 whitespace-normal break-words">
        {item.label}
      </span>
    </Link>
  )
}
