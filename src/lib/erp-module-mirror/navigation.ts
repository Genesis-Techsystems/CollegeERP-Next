import { isAdminInstitutionalRoomContext } from "@/lib/admin-institutional-navigation";
import {
  mapModuleTail,
  normalizeLabelKey,
} from "@/lib/erp-modules-navigation-utils";
import { resolveModuleSlug } from "./get-route";
import { ERP_MODULE_REGISTRY } from "./registry";
import type { ErpModuleMirrorConfig } from "./types";

/** Angular segments claimed by more than one mirrored module. */
function sharedAngularSegments(): Set<string> {
  const counts = new Map<string, number>();
  for (const mod of ERP_MODULE_REGISTRY) {
    const key = mod.angularSegment.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const shared = new Set<string>();
  for (const [segment, count] of counts) {
    if (count > 1) shared.add(segment);
  }
  return shared;
}

const SHARED_ANGULAR_SEGMENTS = sharedAngularSegments();

function isSharedAngularSegment(segment: string): boolean {
  return SHARED_ANGULAR_SEGMENTS.has(segment.toLowerCase());
}

function buildSlugMap(mod: ErpModuleMirrorConfig): Record<string, string> {
  const map: Record<string, string> = { ...(mod.slugAliases ?? {}) };
  // Longer slugs first so `vehicle-map` is not shadowed by `vehicle`.
  const routes = [...mod.routes].sort(
    (a, b) => b.slug.split("/")[0]!.length - a.slug.split("/")[0]!.length,
  );
  for (const route of routes) {
    const parts = route.slug.split("/");
    const first = parts[0]!.toLowerCase();
    // Only map top-level (single-segment) slugs. Nested routes share the same
    // first segment (e.g. placements/companies, placements/placement-companies)
    // and must not overwrite each other in the alias map.
    if (parts.length === 1) {
      map[first] = route.slug;
      map[first.replace(/-/g, "")] = route.slug;
    } else {
      // Also index full nested slugs (e.g. certificate-requests/printTc).
      const full = route.slug.toLowerCase();
      map[full] = route.slug;
      map[full.replace(/-/g, "")] = route.slug;
    }
  }
  return map;
}

function mapModuleLabel(
  mod: ErpModuleMirrorConfig,
  label?: string,
): string | null {
  if (!label) return null;
  const key = normalizeLabelKey(label);

  if (mod.labelAliases?.[key]) {
    return `${mod.basePath}/${mod.labelAliases[key]}`;
  }

  // Match specific screens before the module root (e.g. "Transport Details" must not
  // resolve to transport-dashboard because key.includes("transport")).
  // Longer titles first so "Student Transport Details" wins over "Transport Details".
  const routesByTitleLength = [...mod.routes].sort(
    (a, b) =>
      normalizeLabelKey(b.title).length - normalizeLabelKey(a.title).length,
  );
  for (const route of routesByTitleLength) {
    const routeKey = normalizeLabelKey(route.title);
    // Exact title match, plus singular/plural variants (e.g. "Requirement" vs "Requirements").
    if (key === routeKey || key + "s" === routeKey || key === routeKey + "s") {
      return `${mod.basePath}/${route.slug}`;
    }
  }

  // Bare module name (e.g. "Events", "Transport") — do NOT open the default
  // dashboard hub. Parents with children only expand in the sidebar.
  return null;
}

function mapModuleHrefFromUrl(
  mod: ErpModuleMirrorConfig,
  href: string,
): string | null {
  const hrefRaw = href.trim();
  if (!hrefRaw || hrefRaw === "#") return null;
  const hrefLower = hrefRaw.toLowerCase();
  const onlyKnown = isSharedAngularSegment(mod.angularSegment);

  const slugs = buildSlugMap(mod);
  const mapped = mapModuleTail(
    hrefRaw,
    mod.angularSegment,
    mod.basePath,
    slugs,
    mod.defaultSlug,
    { onlyKnownSlugs: onlyKnown },
  );
  if (mapped) return mapped;

  // Shared segment + unknown slug: do not invent a path for this module.
  if (onlyKnown && hrefLower.includes(mod.angularSegment.toLowerCase())) {
    return null;
  }

  const seg = `/${mod.angularSegment.replace(/\/$/, "")}/`;
  if (
    hrefLower.includes(seg) ||
    hrefLower.includes(`/apps/${mod.angularSegment}`)
  ) {
    const idx = Math.max(
      hrefLower.indexOf(seg),
      hrefLower.indexOf(`/apps/${mod.angularSegment}`),
    );
    const tailStart =
      hrefLower.indexOf(`/apps/${mod.angularSegment}`) >= 0
        ? hrefLower.indexOf(`/apps/${mod.angularSegment}`) +
          `/apps/${mod.angularSegment}`.length
        : idx + seg.length;
    const tail = hrefRaw.slice(tailStart).split("?")[0].replace(/^\/+/, "");
    if (!tail) return `${mod.basePath}/${mod.defaultSlug}`;
    const resolved = resolveModuleSlug(mod, tail);
    return `${mod.basePath}/${resolved}`;
  }

  if (hrefLower.includes(mod.basePath.replace(/^\//, ""))) {
    const idx = hrefLower.indexOf(mod.basePath.replace(/^\//, ""));
    const tail = hrefRaw.slice(idx).split("?")[0];
    if (tail.startsWith(mod.basePath)) {
      const rest = tail.slice(mod.basePath.length).replace(/^\/+/, "");
      if (!rest) return `${mod.basePath}/${mod.defaultSlug}`;

      // Stale remaps: /tc-no-due-approval/course-completion-certificate → /certificates/...
      if (mod.id === "tc-no-due-approval") {
        const restLower = rest.toLowerCase();
        const issuanceHit = getCertificateIssuanceOnlySlugs().find(
          (s) =>
            restLower === s.toLowerCase() ||
            restLower.startsWith(`${s.toLowerCase()}/`),
        );
        if (issuanceHit) return `/certificates/${rest}`;
      }

      const resolved = resolveModuleSlug(mod, rest);
      return `${mod.basePath}/${resolved}`;
    }
  }

  return null;
}

function mapModuleHref(
  mod: ErpModuleMirrorConfig,
  href?: string,
  label?: string,
): string | null {
  if (mod.id === "hostel" && isAdminInstitutionalRoomContext(href, label)) {
    return null;
  }

  // Sidebar labels from the API are authoritative when aliased (href in DB is often wrong).
  if (label) {
    const key = normalizeLabelKey(label);
    if (mod.labelAliases?.[key]) {
      return `${mod.basePath}/${mod.labelAliases[key]}`;
    }
  }

  const hrefRaw = (href ?? "").trim();
  if (hrefRaw && hrefRaw !== "#") {
    const fromHref = mapModuleHrefFromUrl(mod, hrefRaw);
    if (fromHref) return fromHref;
  }

  return mapModuleLabel(mod, label);
}

/**
 * Prefer the module that owns the resolved slug when several modules share an
 * Angular segment (certificates/ → TC workflow vs Certificates issuance), or
 * when colliding labels (e.g. "Registered List") match more than one module.
 */
export function mapMirroredModuleNavRoute(
  href?: string,
  label?: string,
): string | null {
  let candidates: string[] = [];
  for (const mod of ERP_MODULE_REGISTRY) {
    const route = mapModuleHref(mod, href, label);
    if (route) candidates.push(route);
  }
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]!;

  const hrefLower = (href ?? "").toLowerCase();
  if (hrefLower) {
    const hrefMatched = candidates.filter((route) => {
      const mod = ERP_MODULE_REGISTRY.find(
        (m) => route === m.basePath || route.startsWith(`${m.basePath}/`),
      );
      if (!mod) return false;
      const angular = mod.angularSegment.replace(/\/$/, "").toLowerCase();
      const base = mod.basePath.replace(/^\//, "").toLowerCase();
      return (
        hrefLower.includes(`${base}/`) ||
        hrefLower.includes(`/${base}/`) ||
        hrefLower.includes(`${base}`) ||
        hrefLower.includes(`${angular}/`) ||
        hrefLower.includes(`/${angular}/`) ||
        hrefLower.includes(angular)
      );
    });
    if (hrefMatched.length === 1) return hrefMatched[0]!;
    if (hrefMatched.length > 1) candidates = hrefMatched;
  }

  // Prefer a non-placeholder owner: if one candidate is under /certificates and
  // the slug is certificate-issuance-only, that path wins over TC stub paths.
  const certOnly = candidates.find((c) => c.startsWith("/certificates/"));
  const tcPath = candidates.find((c) => c.startsWith("/tc-no-due-approval/"));
  if (certOnly && tcPath) {
    const certSlug = certOnly.slice("/certificates/".length).toLowerCase();
    const tcMod = ERP_MODULE_REGISTRY.find(
      (m) => m.id === "tc-no-due-approval",
    );
    const tcOwns = tcMod?.routes.some(
      (r) =>
        r.slug.toLowerCase() === certSlug ||
        certSlug.startsWith(`${r.slug.toLowerCase()}/`),
    );
    if (!tcOwns) return certOnly;
    return tcPath;
  }

  return candidates[0]!;
}

export function mapMirroredModuleLabelToRoute(label?: string): string | null {
  // Same multi-candidate preference as href mapping.
  return mapMirroredModuleNavRoute(undefined, label);
}

export function isMirroredModuleLabel(
  label: string | undefined,
  moduleId: string,
): boolean {
  if (!label) return false;
  const mod = ERP_MODULE_REGISTRY.find((m) => m.id === moduleId);
  if (!mod) return false;
  const key = normalizeLabelKey(label);
  const modKey = normalizeLabelKey(mod.moduleLabel);
  return key === modKey || key.includes(modKey);
}

/** Slugs that belong to Certificates issuance, not TC workflow. */
export function getCertificateIssuanceOnlySlugs(): string[] {
  const tc = ERP_MODULE_REGISTRY.find((m) => m.id === "tc-no-due-approval");
  const certs = ERP_MODULE_REGISTRY.find((m) => m.id === "certificates");
  if (!tc || !certs) return [];
  const tcSlugs = new Set(tc.routes.map((r) => r.slug.toLowerCase()));
  return certs.routes
    .map((r) => r.slug)
    .filter((slug) => !tcSlugs.has(slug.toLowerCase()));
}

/**
 * Pin Certificates issuance screens (course/program completion, custodian, …)
 * before TC & No Due remaps that also listen on Angular `certificates/`.
 */
export function resolveCertificateIssuanceNavRoute(
  href?: string,
  label?: string,
): string | null {
  const hrefLower = (href ?? "").toLowerCase();
  const labelKey = normalizeLabelKey(label ?? "");

  const pins: Array<{
    slug: string;
    match: (h: string, k: string) => boolean;
  }> = [
    {
      slug: "course-completion-certificate",
      match: (h, k) =>
        h.includes("course-completion") ||
        h.includes("program-completion") ||
        k.includes("coursecompletion") ||
        k.includes("coursecomplete") ||
        k.includes("programcompletion") ||
        k.includes("programcomplete"),
    },
    {
      slug: "custodian-certificate",
      match: (h, k) => h.includes("custodian") || k.includes("custodian"),
    },
    {
      slug: "medium-of-instruction-certificate",
      match: (h, k) =>
        h.includes("medium-of-instruction") ||
        h.includes("mediumofinstruction") ||
        k.includes("mediumofinstruction"),
    },
    {
      slug: "bonafide-conduct-certificate",
      match: (h, k) =>
        h.includes("bonafide-conduct") ||
        h.includes("bonafideconduct") ||
        (k.includes("bonafide") && k.includes("conduct")) ||
        (k.includes("bonafied") && k.includes("conduct")),
    },
    {
      slug: "no-objection-certificate",
      match: (h, k) =>
        h.includes("no-objection") ||
        h.includes("noobjection") ||
        k.includes("noobjection") ||
        (k.includes("noc") && k.includes("certificate")),
    },
    {
      slug: "bonafied-certificate",
      match: (h, k) =>
        h.includes("bonafied-certificate") ||
        h.includes("bonafide-certificate") ||
        k === "bonafiedcertificate" ||
        k === "bonafidecertificate",
    },
  ];

  for (const pin of pins) {
    if (pin.match(hrefLower, labelKey)) {
      return `/certificates/${pin.slug}`;
    }
  }

  return null;
}
