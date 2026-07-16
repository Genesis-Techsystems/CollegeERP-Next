import { redirect } from "next/navigation";

type LegacyPostExamAliasProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export default async function LegacyPostExamAliasPage({
  params,
}: LegacyPostExamAliasProps) {
  const { slug: slugParam } = await params;
  const slug = slugParam ?? [];
  const tail = slug.length > 0 ? `/${slug.join("/")}` : "";
  redirect(`/admin-examination-management/post-examination${tail}`);
}
