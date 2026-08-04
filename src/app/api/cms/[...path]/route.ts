// CMS BFF route — forwards to Spring Boot (SPRING_API_URL already includes /cms).
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/lib/session";
import type { IronSessionData } from "@/types/user";

type Context = { params: Promise<{ path: string[] }> };

async function cmsRequest(
  request: NextRequest,
  context: Context,
): Promise<NextResponse> {
  const session = await getIronSession<IronSessionData>(
    await cookies(),
    sessionOptions,
  );
  if (!session.jwt || !session.user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Session expired" },
      { status: 401 },
    );
  }

  const { path } = await context.params;
  const queryString = request.nextUrl.search;
  const targetUrl = `${process.env.SPRING_API_URL}/${path.join("/")}${queryString}`;

  const method = request.method;
  const hasBody = method === "POST" || method === "PUT" || method === "PATCH";
  const incomingContentType = request.headers.get("content-type") ?? "";
  const isMultipart = incomingContentType.includes("multipart/form-data");

  let upstreamRes: Response;
  try {
    if (hasBody && isMultipart) {
      // Rebuild FormData so upstream gets a fresh boundary (raw arrayBuffer
      // forward can drop Spring @RequestPart("data")).
      const incoming = await request.formData();
      const body = new FormData();
      for (const [key, value] of incoming.entries()) {
        if (key === "data") {
          const json =
            typeof value === "string" ? value : await (value as Blob).text();
          body.append("data", new Blob([json], { type: "application/json" }));
        } else if (value instanceof File) {
          body.append(key, value, value.name);
        } else {
          body.append(key, value);
        }
      }
      upstreamRes = await fetch(targetUrl, {
        method,
        headers: { Authorization: `Bearer ${session.jwt}` },
        body,
      });
    } else {
      upstreamRes = await fetch(targetUrl, {
        method,
        headers: {
          Authorization: `Bearer ${session.jwt}`,
          "Content-Type": "application/json",
        },
        ...(hasBody ? { body: await request.text() } : {}),
      });
    }
  } catch {
    return NextResponse.json(
      { message: "Service unavailable" },
      { status: 502 },
    );
  }

  if (upstreamRes.status === 401) {
    session.destroy();
    return NextResponse.json({ message: "Session expired" }, { status: 401 });
  }

  const data = await upstreamRes.json().catch(() => null);
  return NextResponse.json(data, { status: upstreamRes.status });
}

export const GET = cmsRequest;
export const POST = cmsRequest;
export const PUT = cmsRequest;
export const DELETE = cmsRequest;
