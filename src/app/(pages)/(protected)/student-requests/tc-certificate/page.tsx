import { redirect } from "next/navigation";

/** Angular route alias → Next.js student TC page. */
export default function Page() {
  redirect("/student-requests/request-for-tc");
}
