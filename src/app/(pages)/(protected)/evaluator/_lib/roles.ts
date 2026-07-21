import {
  LayoutDashboard,
  BookOpen,
  Upload,
  Barcode,
  PackagePlus,
  ScanLine,
  Boxes,
  Monitor,
  Camera,
  Printer,
  Wrench,
  ShieldCheck,
  FolderOpen,
  UserCog,
  Split,
  ClipboardCheck,
  Scale,
  Download,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type RoleId =
  | "admin"
  | "collection"
  | "scan-supervisor"
  | "scanner"
  | "evaluator"
  | "chief-evaluator"
  | "result-officer";

export type NavItem = { title: string; icon: LucideIcon };

export type Role = {
  id: RoleId;
  label: string;
  short: string;
  personName: string;
  headerTitle: string;
  headerSubtitle: string;
  nav: NavItem[];
};

export const ROLES: Role[] = [
  {
    id: "admin",
    label: "Admin / COE",
    short: "Admin / COE",
    personName: "Dr. Rajesh Kumar",
    headerTitle: "COE Dashboard",
    headerSubtitle: "Welcome, Dr. Rajesh Kumar — system overview",
    nav: [
      { title: "Dashboard", icon: LayoutDashboard },
      { title: "Exam Setup", icon: BookOpen },
      { title: "Registration Import", icon: Upload },
      { title: "Barcode Generation", icon: Barcode },
      { title: "Bundle Inward", icon: PackagePlus },
      { title: "Scan Bundles", icon: ScanLine },
      { title: "Bundle Formation", icon: Boxes },
      { title: "Bundle Capture", icon: Monitor },
      { title: "Scanner Capture", icon: Camera },
      { title: "Sticker Print", icon: Printer },
      { title: "Scanning Workbench", icon: Wrench },
      { title: "Scan Verification", icon: ShieldCheck },
      { title: "Script Repository", icon: FolderOpen },
      { title: "Evaluator Setup", icon: UserCog },
      { title: "Script Allocation", icon: Split },
      { title: "Evaluation", icon: ClipboardCheck },
      { title: "Moderation", icon: Scale },
      { title: "Export", icon: Download },
      { title: "Reports", icon: BarChart3 },
    ],
  },
  {
    id: "collection",
    label: "Collection Center Staff",
    short: "Collection Staff",
    personName: "Amit Sharma",
    headerTitle: "Dashboard",
    headerSubtitle: "Welcome, Amit Sharma (Collection Staff)",
    nav: [
      { title: "Dashboard", icon: LayoutDashboard },
      { title: "Bundle Inward", icon: PackagePlus },
      { title: "Scan Bundles", icon: ScanLine },
      { title: "Bundle Formation", icon: Boxes },
      { title: "Bundle Capture", icon: Monitor },
      { title: "Scanner Capture", icon: Camera },
      { title: "Sticker Print", icon: Printer },
    ],
  },
  {
    id: "scan-supervisor",
    label: "Scan Supervisor",
    short: "Scan Supervisor",
    personName: "Priya Verma",
    headerTitle: "Dashboard",
    headerSubtitle: "Welcome, Priya Verma (Scan Supervisor)",
    nav: [
      { title: "Dashboard", icon: LayoutDashboard },
      { title: "Scan Bundles", icon: ScanLine },
      { title: "Bundle Formation", icon: Boxes },
      { title: "Scanning Workbench", icon: Wrench },
      { title: "Scan Verification", icon: ShieldCheck },
      { title: "Script Repository", icon: FolderOpen },
    ],
  },
  {
    id: "scanner",
    label: "Scanner Operator",
    short: "Scanner Operator",
    personName: "Rahul Singh",
    headerTitle: "Scanner Dashboard",
    headerSubtitle: "Operator: Rahul Singh",
    nav: [
      { title: "Dashboard", icon: LayoutDashboard },
      { title: "Scanning Workbench", icon: Wrench },
    ],
  },
  {
    id: "evaluator",
    label: "Evaluator",
    short: "Evaluator",
    personName: "Dr. Meena Patel",
    headerTitle: "Evaluator Dashboard",
    headerSubtitle: "Evaluator: Dr. Meena Patel",
    nav: [
      { title: "Dashboard", icon: LayoutDashboard },
      { title: "Evaluation", icon: ClipboardCheck },
    ],
  },
  {
    id: "chief-evaluator",
    label: "Chief Evaluator",
    short: "Chief Evaluator",
    personName: "Prof. Suresh Nair",
    headerTitle: "Chief Evaluator Dashboard",
    headerSubtitle: "Moderator: Prof. Suresh Nair",
    nav: [
      { title: "Dashboard", icon: LayoutDashboard },
      { title: "Evaluation", icon: ClipboardCheck },
      { title: "Moderation", icon: Scale },
    ],
  },
  {
    id: "result-officer",
    label: "Result Officer",
    short: "Result Officer",
    personName: "Kavita Joshi",
    headerTitle: "Result Officer Dashboard",
    headerSubtitle: "Officer: Kavita Joshi",
    nav: [
      { title: "Dashboard", icon: LayoutDashboard },
      { title: "Export", icon: Download },
      { title: "Reports", icon: BarChart3 },
    ],
  },
];

export const ROLE_STORAGE_KEY = "examdigit.role";

export function getRole(id: string | null | undefined): Role | undefined {
  return ROLES.find((r) => r.id === id);
}