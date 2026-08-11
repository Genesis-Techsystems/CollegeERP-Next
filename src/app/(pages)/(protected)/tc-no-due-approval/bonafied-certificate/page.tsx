import { redirect } from "next/navigation";

/**
 * Shared Angular `certificates/` segment is sometimes mirrored under TC & No Due.
 * Student menu lands here; send to the student-requests Bonafied Certificate page.
 */
export default function Page() {
  redirect("/student-requests/bonafied-certificate");
}
