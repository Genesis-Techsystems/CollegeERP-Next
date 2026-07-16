"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  EXAM_REPORTS_LIVE_UNDER_EXAM_REPORTS,
  normalizeHref,
  normalizePageHref,
  toNavSlug,
} from "@/lib/navigation";
import {
  mapErpModuleLabelToRoute,
  mapErpModuleNavRoute,
} from "@/lib/erp-modules-navigation";
import {
  isTimetableModuleLabel,
  mapTimetableLabelToRoute,
  mapTimetableNavRoute,
} from "@/lib/timetable-navigation";
import {
  mapAdminInstitutionalRoomRoute,
  mapLegacyInstitutionalMastersHref,
} from "@/lib/admin-institutional-navigation";
import {
  isHostelModulePath,
  isHostelRoomAllocationPath,
  mapHostelNavRoute,
} from "@/lib/hostel-navigation";
import {
  mapLegacyMasterSettingsHref,
  resolveForcedNavRoute,
  resolveNavHref,
} from "@/lib/resolve-nav-href";
import { useNavigationStore } from "@/store/navigation-store";
import { cn } from "@/lib/utils";
import type { NavItem as NavItemType } from "@/types/navigation";

// ---------------------------------------------------------------------------
// Icon map: Material Icons (single-word) → Lucide React components
// Keys match Angular's mat-icon ligature names exactly (snake_case).
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ElementType> = {
  // ── Dashboard / Core ──────────────────────────────────────────────────────
  dashboard: LayoutDashboard,
  home: Home,
  apps: AppWindow,
  grid_view: LayoutGrid,
  widgets: LayoutGrid,
  layers: Layers,
  menu: List,
  view_module: LayoutGrid,
  view_list: List,
  view_quilt: LayoutGrid,

  // ── People / HR ───────────────────────────────────────────────────────────
  people: Users,
  group: UsersRound,
  groups: UsersRound,
  person: User,
  person_add: UserPlus,
  person_outline: User,
  contacts: Contact,
  account_circle: User,
  supervisor_account: UserCog,
  manage_accounts: UserCog,
  how_to_reg: UserCheck,
  badge: BadgeCheck,
  assignment_ind: UserCheck,
  face: User,
  emoji_people: User,

  // ── Academics ─────────────────────────────────────────────────────────────
  school: GraduationCap,
  book: BookOpen,
  menu_book: BookOpen,
  book_online: BookOpen,
  library_books: LibraryBig,
  local_library: Library,
  book_marked: BookMarked,
  auto_stories: BookCopy,
  class: Notebook,
  subject: Notebook,
  edit_note: NotebookPen,
  note: Notebook,
  notes: NotebookPen,
  science: FlaskConical,
  biotech: Microscope,
  calculate: Cpu,
  functions: Cpu,
  psychology: Microscope,
  history_edu: GraduationCap,
  model_training: GraduationCap,
  cast_for_education: GraduationCap,
  import_contacts: BookOpen,
  collections_bookmark: BookMarked,

  // ── Exams / Assessment ────────────────────────────────────────────────────
  assignment: ClipboardCheck,
  assignment_turned_in: FileCheck2,
  assignment_return: FileText,
  assessment: FileBadge,
  fact_check: ListChecks,
  quiz: FilePen,
  rule: ListChecks,
  task: ClipboardList,
  task_alt: ClipboardCheck,
  checklist: ListChecks,
  grading: FilePen,
  rate_review: FilePen,
  text_snippet: FileText,
  description: FileText,
  article: FileText,
  content_paste: Clipboard,
  document_scanner: FileSearch,
  find_in_page: FileSearch,
  post_add: FileText,
  summarize: FileText,
  score: Trophy,
  grade: Star,
  stars: Star,
  emoji_events: Trophy,
  military_tech: Award,
  workspace_premium: Award,
  verified: BadgeCheck,

  // ── Finance / Fees ────────────────────────────────────────────────────────
  attach_money: CreditCard,
  money: Banknote,
  payment: Receipt,
  receipt: Receipt,
  receipt_long: Receipt,
  credit_card: CreditCard,
  account_balance: Landmark,
  account_balance_wallet: Wallet,
  savings: PiggyBank,
  monetization_on: DollarSign,
  currency_rupee: DollarSign,
  currency_exchange: DollarSign,
  local_atm: Banknote,
  price_check: CheckSquare,
  sell: Tag,
  price_change: TrendingUp,
  paid: CreditCard,
  request_quote: FileText,
  point_of_sale: Landmark,

  // ── Attendance / Biometric ────────────────────────────────────────────────
  attendance: ScanFace,
  fingerprint: Fingerprint,
  person_search: ScanFace,
  how_to_vote: CheckSquare,
  co_present: UserRoundCheck,
  present_to_all: UserRoundCheck,
  group_add: UserPlus,
  transfer_within_a_station: UserCheck,
  directions_walk: UserCheck,

  // ── Timetable / Calendar / Schedule ──────────────────────────────────────
  event: CalendarClock,
  event_note: CalendarDays,
  event_available: CalendarCheck,
  today: CalendarDays,
  calendar_today: CalendarCheck,
  calendar_month: CalendarDays,
  date_range: CalendarRange,
  schedule: Clock,
  alarm: Clock,
  timer: Clock,
  pending_actions: Clock,
  watch_later: Clock,
  history: RefreshCw,
  update: RefreshCw,
  next_plan: CalendarRange,
  view_timeline: CalendarRange,

  // ── Reports / Analytics ───────────────────────────────────────────────────
  bar_chart: BarChart3,
  bar_chart_4_bars: BarChart2,
  stacked_bar_chart: BarChart3,
  insert_chart: BarChart3,
  insert_chart_outlined: BarChart3,
  area_chart: LineChart,
  show_chart: LineChart,
  multiline_chart: LineChart,
  trending_up: TrendingUp,
  trending_down: TrendingUp,
  analytics: PieChart,
  donut_large: PieChart,
  pie_chart: PieChart,
  ssid_chart: LineChart,
  leaderboard: BarChart3,
  query_stats: BarChart3,
  data_usage: PieChart,
  table_chart: Grid3X3,
  grid_on: Grid3X3,
  pivot_table_chart: Grid3X3,

  // ── Settings / Configuration ──────────────────────────────────────────────
  settings: Settings2,
  settings_applications: Settings,
  settings_suggest: Settings,
  tune: SlidersHorizontal,
  build: Wrench,
  build_circle: Wrench,
  handyman: Wrench,
  admin_panel_settings: ShieldCheck,
  miscellaneous_services: Settings,
  display_settings: Settings,
  manage_search: Search,
  rule_settings: SlidersHorizontal,
  format_list_bulleted: List,
  filter_list: Filter,
  category: Tag,

  // ── Communication ─────────────────────────────────────────────────────────
  announcement: Megaphone,
  campaign: Megaphone,
  notifications: Bell,
  notifications_active: BellRing,
  notifications_none: Bell,
  add_alert: BellRing,
  email: Mail,
  mail: Mail,
  inbox: Mail,
  mark_email_read: Mail,
  message: MessageSquare,
  sms: MessageSquare,
  chat: MessageCircle,
  chat_bubble: MessageCircle,
  question_answer: MessageCircle,
  forum: MessageCircle,
  send: Send,
  reply: Send,
  share: ExternalLink,

  // ── Transport / Location ──────────────────────────────────────────────────
  directions_bus: Bus,
  bus_alert: Bus,
  airport_shuttle: Bus,
  local_taxi: Car,
  drive_eta: Car,
  directions_car: Car,
  electric_car: Car,
  location_on: MapPin,
  location_city: Building2,
  map: Map,
  navigation: Navigation,
  near_me: Navigation,
  place: MapPin,
  room: MapPin,
  my_location: MapPin,
  explore: Globe,
  route: Navigation,
  alt_route: Navigation,
  roundabout_right: Navigation,
  traffic: Navigation,

  // ── Hostel / Buildings ────────────────────────────────────────────────────
  hotel: BedDouble,
  house: Home,
  domain: Building2,
  business: Building,
  apartment: Building,
  corporate_fare: Building2,
  foundation: Building,
  villa: Home,
  night_shelter: Hotel,
  bungalow: Home,
  bedroom_parent: BedDouble,
  bedroom_child: BedDouble,
  king_bed: BedDouble,
  single_bed: BedDouble,
  meeting_room: Building,
  sensor_door: Building,

  // ── Library / Files / Documents ───────────────────────────────────────────
  upload: Upload,
  download: Download,
  file_upload: FileUp,
  cloud_upload: Upload,
  cloud_download: Download,
  folder: Folder,
  folder_open: FolderOpen,
  folder_shared: Folder,
  insert_drive_file: FileText,
  file_copy: BookCopy,
  copy_all: BookCopy,
  print: Printer,
  local_printshop: Printer,
  picture_as_pdf: FileText,
  image: Image,
  photo: Image,
  collections: Image,
  video_library: Video,
  music_note: Music,
  attachment: LinkIcon,
  link: LinkIcon,
  open_in_new: ExternalLink,

  // ── Admin / Security / Access ─────────────────────────────────────────────
  security: Shield,
  verified_user: ShieldCheck,
  gpp_good: ShieldCheck,
  lock: Lock,
  lock_open: Lock,
  vpn_key: Key,
  key: Key,
  password: Key,
  no_encryption: Lock,
  enhanced_encryption: ShieldCheck,
  privacy_tip: ShieldCheck,

  // ── IT / Tech ─────────────────────────────────────────────────────────────
  computer: Monitor,
  laptop: Laptop,
  phone_android: Smartphone,
  tablet: Tablet,
  memory: Cpu,
  developer_board: Cpu,
  storage: Database,
  dns: Server,
  cloud: Cloud,
  wifi: Wifi,
  code: Code,
  terminal: Terminal,
  integration_instructions: Code,
  developer_mode: Code,
  api: Code,
  data_object: Database,
  data_array: Database,
  schema: GitBranch,
  source: GitBranch,
  inventory: Package,
  inventory_2: Box,
  archive: Archive,
  unarchive: Archive,

  // ── Misc / General ────────────────────────────────────────────────────────
  info: Info,
  info_outline: Info,
  help: HelpCircle,
  help_outline: HelpCircle,
  warning: AlertCircle,
  error: AlertCircle,
  error_outline: AlertCircle,
  new_releases: Zap,
  whatshot: Zap,
  bolt: Zap,
  flash_on: Zap,
  highlight: Zap,
  health_and_safety: Heart,
  favorite: Heart,
  medical_services: Heart,
  local_hospital: Heart,
  sentiment_satisfied: Smile,
  emoji_emotions: Smile,
  light_mode: Sun,
  dark_mode: Moon,
  wb_sunny: Sun,
  nights_stay: Moon,
  air: Wind,
  tag: Hash,
  label: Tag,
  label_important: Tags,
  new_label: Tags,
  work: Landmark,
  work_outline: Landmark,
  business_center: Landmark,
  cases: Box,
  move_to_inbox: Mail,
  outbox: Send,
  pending: Clock,
  done: Check,
  done_all: CheckSquare,
  check_circle: Check,
  check_box: CheckSquare,
  close: X,
  delete: Trash2,
  remove_circle: Minus,
  add_circle: Plus,
  edit: Edit,
  create: Edit,
  search: Search,
  star: Star,
  star_border: Star,
  bookmark: BookMarked,
  bookmark_border: BookMarked,
  flag: Activity,
  arrow_forward: ArrowRight,
  arrow_forward_ios: ChevronRight,
  chevron_right: ChevronRight,
  expand_more: ChevronDown,
  more_vert: List,
  more_horiz: List,
  refresh: RefreshCw,
  sync: RefreshCw,
  autorenew: RefreshCw,
  swap_horiz: ArrowRight,
  swap_vert: ArrowRight,
  compare_arrows: ArrowRight,
  call_made: ArrowRight,
  north_east: ArrowRight,
  open_in_browser: ExternalLink,
};

// ---------------------------------------------------------------------------
// Multi-word CSS class icon resolver (e.g. "fa fa-graduation-cap")
// Strips fa-/icon- prefix, converts dashes to underscores, looks up ICON_MAP.
// Also tries the dashed form without conversion as a fallback.
// ---------------------------------------------------------------------------

function resolveIcon(name?: string): React.ElementType | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;

  // Single-word Material icon (most common)
  if (!trimmed.includes(" ")) {
    return ICON_MAP[trimmed] ?? null;
  }

  // Multi-word CSS class icon: "fa fa-graduation-cap", "icon-home", etc.
  // Try tokens from right to left (last token is usually the most specific)
  const tokens = trimmed.split(/\s+/);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    // Strip common prefixes
    const stripped = token
      .replace(/^fa-/, "")
      .replace(/^icon-/, "")
      .replace(/^glyphicon-/, "");
    // Try underscore form ("graduation-cap" → "graduation_cap")
    const underscored = stripped.replace(/-/g, "_");
    if (ICON_MAP[underscored]) return ICON_MAP[underscored];
    // Try dashed form as-is ("bar_chart" stored with dashes)
    if (ICON_MAP[stripped]) return ICON_MAP[stripped];
    // Try without any transformation
    if (ICON_MAP[token]) return ICON_MAP[token];
  }

  return null;
}

function inferIconNameFromLabel(label?: string): string | undefined {
  if (!label) return undefined;
  const lower = label.toLowerCase();

  // Specific examination flows
  if (lower.includes("exam masters") || lower.includes("master settings"))
    return "settings";
  if (lower.includes("pre examination")) return "event_note";
  if (lower.includes("evaluation process")) return "fact_check";
  if (lower.includes("post examination")) return "assignment_turned_in";
  if (lower.includes("re-evaluation") || lower.includes("reevaluation"))
    return "rate_review";
  if (lower.includes("delivery process") || lower.includes("papers delivery"))
    return "folder_open";
  if (lower.includes("result processing")) return "leaderboard";

  // Top-level modules
  if (
    lower === "admin" ||
    lower.includes("admin panel") ||
    lower.includes("administration")
  )
    return "admin_panel_settings";
  if (lower.includes("admission")) return "person_add";
  if (lower.includes("academics") || lower.includes("curriculum"))
    return "school";
  if (
    lower === "eoffice" ||
    lower.includes("e-office") ||
    lower.includes("e office")
  )
    return "description";
  if (lower.includes("affiliated college") || lower.includes("affiliated"))
    return "business";
  if (
    lower.includes("hr") ||
    lower.includes("human resource") ||
    lower.includes("payroll")
  )
    return "badge";
  if (
    lower.includes("time-table") ||
    lower.includes("timetable") ||
    lower.includes("time table")
  )
    return "schedule";
  if (lower.includes("student information") || lower.includes("sis"))
    return "contacts";
  if (lower.includes("attendance")) return "task_alt";
  if (
    lower.includes("account") ||
    lower.includes("fee") ||
    lower.includes("payment") ||
    lower.includes("bank")
  )
    return "account_balance_wallet";
  if (lower.includes("scholarship")) return "workspace_premium";
  if (lower.includes("mentorship") || lower.includes("mentor"))
    return "how_to_reg";
  if (lower.includes("event")) return "event";
  if (lower.includes("library")) return "local_library";
  if (lower.includes("hostel") || lower.includes("dormitory")) return "hotel";
  if (lower.includes("transport") || lower.includes("bus"))
    return "directions_bus";
  if (
    lower.includes("communication") ||
    lower.includes("email") ||
    lower.includes("sms")
  )
    return "mail";
  if (lower.includes("campus maintenance") || lower.includes("maintenance"))
    return "build";
  if (lower.includes("inventory") || lower.includes("stock"))
    return "inventory";
  if (lower.includes("dashboard")) return "dashboard";

  // Generic categories
  if (lower.includes("student") || lower.includes("user")) return "people";
  if (
    lower.includes("performance") ||
    lower.includes("analytics") ||
    lower.includes("report")
  )
    return "trending_up";
  if (lower.includes("exam") || lower.includes("assessment"))
    return "fact_check";
  if (
    lower.includes("course") ||
    lower.includes("subject") ||
    lower.includes("class")
  )
    return "menu_book";
  if (lower.includes("setting") || lower.includes("config")) return "settings";
  if (lower.includes("notification") || lower.includes("message"))
    return "notifications";
  if (lower.includes("certificate") || lower.includes("document"))
    return "description";

  return undefined;
}

// ---------------------------------------------------------------------------
// NavIcon sub-component
// kind='module' → fallback LayoutDashboard (top-level module)
// kind='page'   → fallback ChevronRight (leaf page)
// ---------------------------------------------------------------------------

function NavIcon({
  name,
  active,
  kind = "page",
  /** Solid primary background (Exam masters design-system row) */
  primarySurface = false,
}: {
  name?: string;
  active?: boolean;
  kind?: "module" | "page";
  primarySurface?: boolean;
}) {
  const resolved = resolveIcon(name);
  const Icon = resolved ?? (kind === "module" ? LayoutDashboard : ChevronRight);

  return (
    <span
      className={cn(
        "flex items-center justify-center h-[20px] w-[20px] shrink-0 transition-colors duration-150",
        primarySurface && "text-[hsl(var(--primary-foreground))]",
        !primarySurface &&
          (active
            ? "text-white"
            : kind === "module"
              ? "text-[hsl(var(--sidebar-foreground))]"
              : "text-[hsl(var(--sidebar-foreground))]/80"),
      )}
    >
      <Icon
        className="h-[18px] w-[18px]"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </span>
  );
}

// ---------------------------------------------------------------------------
// NavItem component
// ---------------------------------------------------------------------------

interface NavItemProps {
  item: NavItemType;
  depth?: number;
  /**
   * Pass `false` until the sidebar layout finishes client mount so nav markup matches SSR.
   * Zustand `persist` can rehydrate `isSidebarCollapsed` before hydration; without this guard
   * the tree flips between expanded links and icon-only buttons and causes hydration errors.
   */
  layoutHydrated?: boolean;
}

/** Recursively checks if any descendant has an href matching the current pathname. */
function hasActiveDescendant(item: NavItemType, pathname: string): boolean {
  if (!item.children) return false;
  const normPath = normalizeHref(pathname);

  const mapLabelToRoute = (label?: string): string | null => {
    const lower = (label ?? "").toLowerCase();
    if (lower.includes("unit topic bulk upload"))
      return "/admin/bulk-uploads/unit-topic-bulk-upload";
    if (
      lower.includes("photos bulk upload") ||
      lower.includes("photo bulk upload")
    ) {
      return "/admin/bulk-uploads/photos-bulk-upload";
    }
    if (
      lower.includes("temporary staging tables bulk upload") ||
      lower.includes("temparory staging table bulk upload")
    ) {
      return "/admin/bulk-uploads/temporary-staging-tables-bulk-upload";
    }
    if (
      lower.includes("dost upload") ||
      lower.includes("student dost upload")
    ) {
      return "/admin/bulk-uploads/student-dost-upload";
    }
    if (
      lower.includes("student bulk upload") ||
      lower.includes("students upload")
    ) {
      return "/admin/bulk-uploads/students-upload";
    }
    if (
      lower.includes("books bulk upload") ||
      lower.includes("book bulk upload")
    ) {
      return "/admin/bulk-uploads/books-bulk-upload";
    }
    if (lower.includes("send login detail")) {
      return "/email-sms/send-login-details";
    }
    if (
      lower.includes("email log") ||
      lower.includes("email-log") ||
      lower.includes("emaillog") ||
      lower.includes("email logs")
    ) {
      return "/email-sms/email-logs";
    }
    if (
      (lower.includes("principal") &&
        lower.includes("staff") &&
        lower.includes("admin") &&
        lower.includes("email")) ||
      lower.includes("principal-staff-to-admin") ||
      lower.includes("principal and staff to admin")
    ) {
      return "/email-sms/principal-staff-to-admin-email";
    }
    if (
      lower.includes("send email to admin") ||
      lower.includes("principal-to-staff-email") ||
      (lower.includes("email to admin") &&
        !lower.includes("principal") &&
        !lower.includes("staff") &&
        !lower.includes("department"))
    ) {
      return "/email-sms/principal-to-staff-email";
    }
    if (
      lower.includes("staff-to-student-email") ||
      (lower.includes("staff") &&
        lower.includes("student") &&
        lower.includes("email")) ||
      (lower.includes("send email") &&
        lower.includes("student") &&
        !lower.includes("sms") &&
        !lower.includes("login"))
    ) {
      return "/email-sms/staff-to-student-email";
    }
    if (
      lower.includes("depart-wise") ||
      lower.includes("dept-wise") ||
      lower.includes("department-wise-email") ||
      lower.includes("department-wise-emial") ||
      (lower.includes("department") &&
        lower.includes("wise") &&
        lower.includes("email"))
    ) {
      return "/email-sms/department-wise-email";
    }
    if (
      lower.includes("principal-to-dept") ||
      lower.includes("principal-to-dpt") ||
      (lower.includes("send email") &&
        lower.includes("department") &&
        lower.includes("email") &&
        !lower.includes("wise") &&
        !lower.includes("student"))
    ) {
      return "/email-sms/principal-to-dept-email";
    }
    if (
      (lower.includes("absent") || lower.includes("absentee")) &&
      (lower.includes("sms") || lower.includes("message"))
    ) {
      return "/email-sms/send-sms-to-absents";
    }
    if (
      lower.includes("staff") &&
      lower.includes("sms") &&
      (lower.includes("attendance") ||
        lower.includes("not marked") ||
        lower.includes("not taken")) &&
      !lower.includes("absent") &&
      !lower.includes("absentee")
    ) {
      return "/email-sms/send-sms-to-staff-attendance";
    }
    if (
      (lower.includes("send sms") &&
        lower.includes("student") &&
        !lower.includes("staff") &&
        !lower.includes("absent")) ||
      lower.includes("send-student-sms") ||
      lower.includes("send sms to student")
    ) {
      return "/email-sms/send-sms-to-students";
    }
    if (
      lower.includes("question bank") &&
      !lower.includes("exam question") &&
      !lower.includes("question paper")
    ) {
      return "/assessments/question-bank";
    }
    if (lower.includes("room type") || lower === "room types")
      return "/admin/room-types";
    if (lower.includes("room details") || lower === "room detail")
      return "/admin/room-details";
    if (
      lower.includes("exam") &&
      lower.includes("timetable") &&
      lower.includes("report") &&
      !lower.includes("course year") &&
      !lower.includes("lab")
    ) {
      return "/admin-examination-management/admin-exam-reports/exam-timetable-report";
    }
    if (
      lower.includes("invigilator") &&
      lower.includes("allot") &&
      lower.includes("report")
    ) {
      return "/admin-examination-management/admin-exam-reports/exam-invigilator-allotment-report";
    }
    if (
      lower.includes("student") &&
      lower.includes("registration") &&
      lower.includes("report") &&
      !lower.includes("timetable")
    ) {
      return "/admin-examination-management/admin-exam-reports/exam-student-registration-report";
    }
    if (
      lower.includes("summary") &&
      lower.includes("result") &&
      lower.includes("report")
    ) {
      return "/admin-examination-management/admin-exam-reports/student-summary-result-report";
    }
    if (
      lower.includes("result") &&
      lower.includes("detail") &&
      lower.includes("report")
    ) {
      return "/admin-examination-management/admin-exam-reports/student-result-details-report";
    }
    if (
      lower.includes("batch") &&
      lower.includes("backlog") &&
      lower.includes("report")
    ) {
      return "/admin-examination-management/admin-exam-reports/student-backlog-data";
    }
    if (
      lower.includes("backlog") &&
      lower.includes("report") &&
      lower.includes("student") &&
      !lower.includes("batch")
    ) {
      return "/admin-examination-management/admin-exam-reports/student-backlog-report";
    }
    if (
      lower.includes("credit") &&
      lower.includes("report") &&
      (lower.includes("student") || lower.includes("credits"))
    ) {
      return "/admin-examination-management/admin-exam-reports/student-credits-report";
    }
    if (lower.includes("assignment") && lower.includes("pending")) {
      return "/admin-examination-management/admin-exam-reports/assignment-pending-list-report";
    }
    if (
      lower.includes("moderation") &&
      lower.includes("report") &&
      !lower.includes("benefit") &&
      !lower.includes("jntu") &&
      !lower.includes("rule") &&
      !lower.includes("before") &&
      !lower.includes("after") &&
      !lower.includes("analysis") &&
      !lower.includes("apply")
    ) {
      return "/admin-examination-management/admin-exam-reports/exam-moderation-reports";
    }
    if (
      (lower.includes("grace") &&
        lower.includes("mark") &&
        lower.includes("report")) ||
      (lower.includes("gracemark") && lower.includes("report"))
    ) {
      if (!lower.includes("benefit") && !lower.includes("jntu")) {
        return "/admin-examination-management/admin-exam-reports/exam-gracemarks-reports";
      }
    }
    if (lower.includes("tabulation")) {
      return "/admin-examination-management/admin-exam-reports/tabulation-register";
    }
    if (
      (lower.includes("exam") &&
        lower.includes("result") &&
        lower.includes("sheet")) ||
      (lower.includes("exam") &&
        lower.includes("results") &&
        lower.includes("sheet"))
    ) {
      return "/admin-examination-management/admin-exam-reports/exam-results-sheets";
    }
    if (lower.includes("gradewise") && lower.includes("result")) {
      return "/admin-examination-management/admin-exam-reports/subject-gradewise-result-report";
    }
    if (
      lower.includes("final") &&
      lower.includes("result") &&
      lower.includes("analysis")
    ) {
      return "/admin-examination-management/admin-exam-reports/final-result-analysis-report";
    }
    if (
      lower.includes("final") &&
      lower.includes("mark") &&
      (lower.includes("pre moderation") ||
        lower.includes("premoderation") ||
        lower.includes("pre-moderation"))
    ) {
      return "/admin-examination-management/admin-exam-reports/final-marks-premoderation";
    }
    if (
      lower.includes("subject") &&
      lower.includes("wise") &&
      lower.includes("result") &&
      !lower.includes("group") &&
      !lower.includes("grade") &&
      !lower.includes("pass percent")
    ) {
      return "/admin-examination-management/admin-exam-reports/subjectwise-result-report";
    }
    if (
      (lower.includes("group") &&
        lower.includes("subject") &&
        lower.includes("result")) ||
      (lower.includes("group") && lower.includes("subjectwise"))
    ) {
      return "/admin-examination-management/admin-exam-reports/group-subjectwise-result-report";
    }
    if (
      (lower.includes("answer") &&
        lower.includes("sheet") &&
        lower.includes("report")) ||
      (lower.includes("exam") &&
        lower.includes("answer") &&
        lower.includes("sheet"))
    ) {
      return "/admin-examination-management/admin-exam-reports/exam-answer-sheets-report";
    }
    const hostel = mapHostelNavRoute(undefined, label);
    if (hostel) return hostel;
    const erpModule = mapErpModuleLabelToRoute(label);
    if (erpModule) return erpModule;
    const timetable = mapTimetableLabelToRoute(label);
    if (timetable) return timetable;
    return null;
  };

  return item.children.some((child) => {
    const ch = child.href?.trim();
    const mapped =
      mapAdminInstitutionalRoomRoute(ch, child.label) ??
      mapHostelNavRoute(ch, child.label) ??
      mapErpModuleNavRoute(ch, child.label) ??
      mapLabelToRoute(child.label) ??
      (ch ? mapLegacyMasterSettingsHref(ch) : null) ??
      ch;
    if (mapped) {
      const nh = normalizeHref(mapped);
      if (normPath === nh || normPath.startsWith(`${nh}/`)) return true;
    }
    return hasActiveDescendant(child, pathname);
  });
}

function findSiblingCollapsibleIds(
  items: NavItemType[],
  targetId: string,
): string[] {
  for (const item of items) {
    const children = item.children ?? [];
    if (children.some((child) => child.id === targetId)) {
      return children
        .filter(
          (child) =>
            child.id !== targetId &&
            child.children &&
            child.children.length > 0,
        )
        .map((child) => child.id);
    }
    if (children.length > 0) {
      const nested = findSiblingCollapsibleIds(children, targetId);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

/**
 * Admin Exam Masters nav branch — primary-tinted active state. Scoped to this subtree only.
 */
function usesExamMastersDesign(item: NavItemType): boolean {
  if (item.href?.includes(EXAM_MASTERS_PATH)) return true;
  if (
    item.id.startsWith("sub_module_") &&
    item.children?.some((c) => c.href?.includes(EXAM_MASTERS_PATH))
  ) {
    return true;
  }
  return false;
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
      "text-[hsl(var(--sidebar-foreground-active))]",
      "font-semibold",
      "bg-[hsl(var(--sidebar-primary))]/15",
      "hover:bg-[hsl(var(--sidebar-primary))]/20",
    );
  }
  if (isChildActive) {
    // Ancestor of the active page — keep it light: bright bold text only, no fill.
    // (Stacked solid pills on every ancestor looked heavy/cluttered.)
    return cn(
      "text-[hsl(var(--sidebar-foreground-active))]",
      "font-semibold",
      "bg-transparent",
      "hover:bg-[hsl(var(--sidebar-hover-bg))]",
    );
  }
  if (isActive) {
    return cn(
      "text-[hsl(var(--sidebar-foreground-active))]",
      "bg-transparent",
      "hover:bg-[hsl(var(--sidebar-hover-bg))]",
    );
  }
  return cn(
    "text-[hsl(var(--sidebar-foreground))]",
    "hover:bg-[hsl(var(--sidebar-hover-bg))]",
    "hover:text-[hsl(var(--sidebar-foreground-active))]",
  );
}

/** Leaf row on active: theme-driven pill (`--sidebar-active-bg`) + active foreground.
 *  Never use `--sidebar-primary` as a fill here — some themes (University Blue)
 *  define it as pure white, which made the active row a white pill with white text. */
function navLeafClasses(_examMasters: boolean, isSelfActive: boolean): string {
  if (isSelfActive) {
    return cn(
      "text-[hsl(var(--sidebar-foreground-active))]",
      "font-semibold",
      "bg-[hsl(var(--sidebar-active-bg))]",
      "shadow-sm",
      "hover:brightness-110",
    );
  }
  return cn(
    "text-[hsl(var(--sidebar-foreground))]",
    "hover:bg-[hsl(var(--sidebar-hover-bg))]",
    "hover:text-[hsl(var(--sidebar-foreground-active))]",
  );
}

const EXAM_MASTERS_PATH = "/admin-examination-management/admin-exam-masters";

/** Sidebar active highlight — same teal as primary / Get List button */
const navActive = {
  text: "text-[hsl(var(--primary))]",
  textHover: "hover:text-[hsl(var(--primary))]",
  solid: "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
  solidHover:
    "hover:bg-[hsl(var(--primary))]/90 hover:text-[hsl(var(--primary-foreground))]",
} as const;


export function NavItem({ item, depth = 0, layoutHydrated }: NavItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  // Boolean / primitive selectors so only items whose open/collapsed or
  // sidebar chrome state actually changed re-render (not the whole tree).
  const isItemCollapsed = useNavigationStore((s) =>
    s.collapsedItems.has(item.id),
  );
  const isSidebarCollapsed = useNavigationStore((s) => s.isSidebarCollapsed);
  const isSidebarHovered = useNavigationStore((s) => s.isSidebarHovered);
  const toggleCollapsed = useNavigationStore((s) => s.toggleCollapsed);
  const setGroupOpen = useNavigationStore((s) => s.setGroupOpen);
  const setSidebarCollapsed = useNavigationStore((s) => s.setSidebarCollapsed);

  const hasChildren = item.children && item.children.length > 0;
  const showLeftIcon = true;
  const hasGenericArrowIcon =
    item.icon === "arrow_forward" ||
    item.icon === "arrow_forward_ios" ||
    item.icon === "chevron_right";
  const inferredIconName = inferIconNameFromLabel(item.label);
  const providedIconIsResolvable = !!item.icon && !!resolveIcon(item.icon);
  const shouldPreferInferredIcon =
    !providedIconIsResolvable || (depth > 0 && hasGenericArrowIcon);
  const iconName = shouldPreferInferredIcon
    ? (inferredIconName ?? item.icon)
    : item.icon;
  // Always show a meaningful icon (backend value, then label inference). The
  // NavIcon component handles the final fallback for leaf pages with no
  // resolvable icon — a subtle dot keeps the icon column rhythm intact.
  const renderedIconName = iconName ?? inferredIconName;

  const labelLower = (item.label ?? "").toLowerCase();
  const forcedRoute = resolveForcedNavRoute(
    item.href,
    item.label ?? "",
    item.id,
    hasChildren,
  );
  const canonicalHref = resolveNavHref(
    item.href,
    item.label ?? "",
    item.id,
    hasChildren,
  );
  const normPathname = normalizeHref(pathname);
  const modulePathActive = (() => {
    const label = (item.label ?? "").toLowerCase().trim();
    if (label === "admin") return normPathname.startsWith("/admin/");
    if (label === "academics") return normPathname.startsWith("/academics/");
    if (
      label.includes("excel bulk uploads") ||
      label.includes("bulk uploads")
    ) {
      return normPathname.startsWith("/admin/bulk-uploads/");
    }
    if (label.includes("affiliated"))
      return normPathname.startsWith("/affiliated-colleges/");
    if (
      (label.includes("hr") && label.includes("payroll")) ||
      label.includes("hr & payroll") ||
      label.includes("hr and payroll")
    ) {
      return normPathname.startsWith("/hr-payroll/");
    }
    if (
      (label.includes("timetable") && label.includes("management")) ||
      label.includes("time table management") ||
      label.includes("timing set")
    ) {
      return normPathname.startsWith("/time-table-management/");
    }
    if (label.includes("attendance") && label.includes("management")) {
      return normPathname.startsWith("/attendance-management/");
    }
    if (
      label.includes("mentorship") ||
      (label.includes("counseling") && !label.includes("meeting"))
    ) {
      return normPathname.startsWith("/mentorship/");
    }
    if (
      label.trim() === "events" ||
      (label.includes("event") && label.includes("calendar"))
    ) {
      return normPathname.startsWith("/events/");
    }
    if (
      label.includes("notification") &&
      label.includes("announcement") &&
      !label.includes("my ")
    ) {
      return normPathname.startsWith("/notifications-and-announcements/");
    }
    if (label.includes("my") && label.includes("notification")) {
      return normPathname.startsWith("/my-notifications");
    }
    if (label.includes("student information"))
      return normPathname.startsWith("/admin-student-information-system/");
    if (label.includes("user management"))
      return normPathname.startsWith("/user-management/");
    if (label.trim() === "security")
      return normPathname.startsWith("/user-management/");
    if (
      (label.includes("email") && label.includes("sms")) ||
      label.includes("email-sms")
    ) {
      return normPathname.startsWith("/email-sms/");
    }
    const examBase = "/admin-examination-management";
    const examReportsPath = normPathname.startsWith(
      `${examBase}/exam-reports/`,
    );
    if (label.includes("examination management")) {
      // Exam report pages belong under Reports → Examination Reports
      if (examReportsPath) return false;
      return normPathname.startsWith(`${examBase}/`);
    }
    if (label.trim() === "reports" || label.trim() === "report") {
      return examReportsPath;
    }
    if (label.includes("exam masters") || label === "exam master") {
      return normPathname.startsWith(`${examBase}/admin-exam-masters/`);
    }
    if (
      label.includes("pre examination") ||
      label.includes("pre-examination")
    ) {
      return normPathname.startsWith(`${examBase}/pre-examination/`);
    }
    if (
      label.includes("post examination") ||
      label.includes("post-examination")
    ) {
      return normPathname.startsWith(`${examBase}/post-examination/`);
    }
    if (label.includes("evaluation process")) {
      return normPathname.startsWith(`${examBase}/evaluation-process/`);
    }
    if (label.includes("re-evaluation") || label.includes("reevaluation")) {
      return normPathname.startsWith(`${examBase}/re-evaluation/`);
    }
    if (
      label.includes("exam papers delivery") ||
      label.includes("papers delivery process")
    ) {
      return normPathname.startsWith(
        `${examBase}/exam-papers-delivery-process/`,
      );
    }
    if (
      label.includes("examination reports") ||
      label.includes("exam reports") ||
      label.includes("evaluators bank copy")
    ) {
      return normPathname.startsWith(`${examBase}/exam-reports/`);
    }
    if (label.includes("result processing")) {
      return normPathname.startsWith(`${examBase}/result-processing/`);
    }
    if (label.includes("assessment"))
      return normPathname.startsWith("/assessments/");
    if (
      label.trim() === "library" ||
      (label.includes("library") && !label.includes("fee"))
    ) {
      return normPathname.startsWith("/library/");
    }
    if (label.includes("accounts") && label.includes("fees")) {
      return normPathname.startsWith("/accounts-and-fees/");
    }
    if (label.includes("fee masters"))
      return normPathname.startsWith("/accounts-and-fees/fee-masters/");
    if (label.includes("fee collection"))
      return normPathname.startsWith("/accounts-and-fees/fees-collection/");
    if (label.includes("hostel") && label.includes("payment")) {
      return normPathname.startsWith(
        "/accounts-and-fees/fees-collection/hostel-payment",
      );
    }
    if (
      label.includes("bus") &&
      label.includes("fee") &&
      label.includes("payment") &&
      !label.includes("faculty")
    ) {
      return normPathname.startsWith(
        "/accounts-and-fees/fees-collection/bus-payment",
      );
    }
    if (
      label.includes("library") &&
      label.includes("fee") &&
      label.includes("payment") &&
      !label.includes("fine")
    ) {
      return normPathname.startsWith(
        "/accounts-and-fees/fees-collection/library-payment",
      );
    }
    if (
      (label.includes("allocate") &&
        label.includes("student") &&
        label.includes("fee") &&
        !label.includes("subject")) ||
      label.includes("allocate student fee")
    ) {
      return normPathname.startsWith(
        "/accounts-and-fees/fees-collection/allocate-student-fee",
      );
    }
    if (
      (label.includes("fee") &&
        label.includes("receipt") &&
        (label.includes("delete") || label.includes("update"))) ||
      label.includes("fee receipts delete")
    ) {
      return normPathname.startsWith(
        "/accounts-and-fees/fees-collection/fee-receipt-update",
      );
    }
    if (
      label.includes("allocate") &&
      label.includes("structure") &&
      label.includes("student")
    ) {
      return normPathname.startsWith(
        "/accounts-and-fees/fees-collection/allocate-structure-to-student",
      );
    }
    if (
      label.includes("scholarship") &&
      (label.includes("preceeding") || label.includes("proceeding"))
    ) {
      return normPathname.startsWith(
        "/accounts-and-fees/fee-reports/scholarship-preceedings",
      );
    }
    if (
      (label.includes("institutional") && label.includes("scholarship")) ||
      (label.includes("concession") && label.includes("list"))
    ) {
      return normPathname.startsWith(
        "/accounts-and-fees/fee-reports/concession-list",
      );
    }
    if (hasChildren && label.trim() === "hostel") {
      return isHostelModulePath(normPathname);
    }
    if (hasChildren && label.includes("transport") && !label.includes("fee")) {
      return normPathname.startsWith("/transport/");
    }
    return false;
  })();
  const hostelAllocationActive =
    canonicalHref === "/hostel/rooms-list" &&
    isHostelRoomAllocationPath(normPathname);
  const isSelfActive =
    !!canonicalHref &&
    canonicalHref.length > 1 &&
    (normPathname === canonicalHref ||
      normPathname.startsWith(`${canonicalHref}/`) ||
      hostelAllocationActive);
  const isChildActive =
    (hasChildren ? hasActiveDescendant(item, pathname) : false) ||
    modulePathActive;
  // Exam report URLs are mounted under /admin-examination-management/exam-reports
  // but live in the sidebar under Reports → Examination Reports. Prefer that
  // top-level module so Examination Management does not steal the active bar
  // via matching descendant hrefs under Admin Exam → Exam Reports.
  const examReportsPath = normPathname.startsWith(
    "/admin-examination-management/exam-reports/",
  );
  const labelForActive = (item.label ?? "").toLowerCase().trim();
  let isActive = isSelfActive || isChildActive || modulePathActive;
  if (examReportsPath && depth === 0) {
    if (
      labelForActive.includes("examination management") &&
      !labelForActive.includes("report")
    ) {
      isActive = false;
    } else if (labelForActive === "reports" || labelForActive === "report") {
      isActive = true;
    }
  }

  const isOpen = !isItemCollapsed;

  const examMasters = usesExamMastersDesign(item);

  // True only when sidebar is collapsed AND the mouse is not hovering over it
  const isEffectivelyCollapsed =
    layoutHydrated === false ? false : isSidebarCollapsed && !isSidebarHovered;

  /* ── Icon-only mode: only top-level module icons shown ──────────── */
  if (isEffectivelyCollapsed) {
    // Sub-items are hidden — only depth-0 module icons render
    if (depth > 0) return null;

    function handleCollapsedClick() {
      // Re-open submenu if user had manually closed it
      if (hasChildren && isItemCollapsed) {
        toggleCollapsed(item.id);
      }
      // Permanently expand the sidebar
      setSidebarCollapsed(false);
    }

    return (
      <button
        type="button"
        title={item.label}
        onClick={handleCollapsedClick}
        className={cn(
          "group relative flex w-full items-center justify-center rounded-md py-2 px-1",
          "transition-colors duration-150 ease-out",
          isActive
            ? "text-[hsl(var(--sidebar-foreground-active))] bg-[hsl(var(--sidebar-active-bg))]"
            : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover-bg))] hover:text-[hsl(var(--sidebar-foreground-active))]",
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
    );
  }

  /* Indent depth (used in expanded view) */
  const paddingLeft =
    depth === 0
      ? "pl-2.5"
      : depth === 1
        ? "pl-7"
        : depth === 2
          ? "pl-10"
          : "pl-12";

  const baseLinkClasses = cn(
    "group relative flex items-center gap-2.5 rounded-md h-10 nav-item font-semibold",
    "transition-colors duration-150 ease-out",
    `pr-3 ${paddingLeft}`,
  );

  /* ── Expanded: parent items (collapsible groups) ─────────────────── */
  if (hasChildren) {
    const handleOpenChange = (open: boolean) => {
      // Accordion: open/close this group and close siblings in one store update.
      const { navItems } = useNavigationStore.getState();
      const siblingIds = open
        ? depth === 0
          ? navItems
              .filter(
                (topLevelItem) =>
                  topLevelItem.id !== item.id && topLevelItem.children?.length,
              )
              .map((topLevelItem) => topLevelItem.id)
          : findSiblingCollapsibleIds(navItems, item.id)
        : [];
      setGroupOpen(item.id, open, siblingIds);
    };

    return (
      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger
          // data attributes let Sidebar's scroll effect target the active parent module
          {...(depth === 0
            ? {
                "data-nav-module": "",
                "data-active": isActive ? "true" : undefined,
              }
            : {})}
          onClick={(e) => {
            if (forcedRoute && !hasChildren) {
              e.preventDefault();
              e.stopPropagation();
              router.push(canonicalHref || normalizeHref(forcedRoute));
            }
          }}
          className={cn(
            baseLinkClasses,
            "w-full",
            navCollapsibleTriggerClasses(
              examMasters,
              isChildActive,
              isSelfActive,
              isActive,
            ),
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
              kind={depth === 0 ? "module" : "page"}
            />
          )}
          <span className="flex-1 text-left leading-5 whitespace-normal break-words">
            {item.label}
          </span>
          <span
            className={cn(
              "ml-auto shrink-0 transition-transform duration-200",
              isActive
                ? "text-white/80"
                : "text-[hsl(var(--sidebar-foreground))]/60",
              isOpen && "rotate-90",
            )}
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <ul className="mt-0.5 space-y-0">
            {item
              .children!.slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((child) => (
                <li key={child.id}>
                  <NavItem
                    item={child}
                    depth={depth + 1}
                    layoutHydrated={layoutHydrated}
                  />
                </li>
              ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  /* ── Expanded: leaf items ────────────────────────────────────────── */
  return (
    <Link
      href={canonicalHref || "#"}
      prefetch={false}
      onClick={(e) => {
        if (forcedRoute) {
          e.preventDefault();
          router.push(canonicalHref || normalizeHref(forcedRoute));
        }
      }}
      aria-current={isSelfActive ? "page" : undefined}
      className={cn(baseLinkClasses, navLeafClasses(examMasters, isSelfActive))}
    >
      {isSelfActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r bg-[hsl(var(--sidebar-primary))]"
          aria-hidden="true"
        />
      )}
      {showLeftIcon && (
        <NavIcon name={renderedIconName} active={isSelfActive} kind="page" />
      )}
      <span className="flex-1 leading-5 whitespace-normal break-words">
        {item.label}
      </span>
    </Link>
  );
}
