import { redirect } from "next/navigation";
import { ModuleRoutePage } from "@/app/(pages)/(protected)/_lib/erp-module-mirror/ModuleRoutePage";
import { getCertificateIssuanceOnlySlugs } from "@/lib/erp-module-mirror/navigation";

type PageProps = { params: Promise<{ slug: string[] }> };

export default async function Page({ params }: PageProps) {
  const { slug: segments } = await params;
  const slug = segments.join("/");
  const slugLower = slug.toLowerCase();

  // Shared Angular `certificates/` segment — issuance pages live under /certificates.
  // Redirect so bookmarks / stale TC remaps open the real screen.
  const issuanceOnly = getCertificateIssuanceOnlySlugs();
  const match = issuanceOnly.find(
    (s) =>
      slugLower === s.toLowerCase() ||
      slugLower.startsWith(`${s.toLowerCase()}/`),
  );
  if (match) {
    redirect(`/certificates/${slug}`);
  }

  return <ModuleRoutePage moduleId="tc-no-due-approval" slug={slug} />;
}
