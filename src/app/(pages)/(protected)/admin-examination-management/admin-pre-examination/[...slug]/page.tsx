import { redirect } from "next/navigation";

type LegacyPreExamAliasProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export default async function LegacyPreExamAliasPage({
  params,
}: LegacyPreExamAliasProps) {
  const { slug: slugParam } = await params;
  const slug = slugParam ?? [];
  const tail = slug.length > 0 ? `/${slug.join("/")}` : "";
  redirect(`/admin-examination-management/pre-examination${tail}`);
}
