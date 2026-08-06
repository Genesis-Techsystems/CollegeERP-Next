// Catch-all proxy route to Spring Boot backend
// SECURITY: validates session before forwarding; JWT is NEVER returned in any response body
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/lib/session";
import type { IronSessionData } from "@/types/user";

type Context = { params: Promise<{ path: string[] }> };

/**
 * Rebuild multipart for upstream fetch.
 * Raw arrayBuffer + original Content-Type can be forwarded with chunked encoding /
 * boundary mismatch so Spring reports MissingServletRequestPartException for `data`.
 * Parsing + re-appending FormData lets undici set a fresh boundary and Content-Length.
 */
async function rebuildMultipartFormData(
  request: NextRequest,
): Promise<FormData> {
  const incoming = await request.formData();
  const outbound = new FormData();

  for (const [key, value] of incoming.entries()) {
    if (key === "data") {
      // Spring: @RequestPart("data") DTO — must be application/json
      const json =
        typeof value === "string" ? value : await (value as Blob).text();
      outbound.append(
        "data",
        new Blob([json], {
          type: "application/json",
        }),
      );
      continue;
    }

    if (value instanceof File) {
      outbound.append(key, value, value.name);
    } else {
      outbound.append(key, value);
    }
  }

  return outbound;
}

async function proxyRequest(
  request: NextRequest,
  context: Context,
): Promise<NextResponse> {
  // 1. Validate session — get jwt server-side only
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

  // 2. Build target URL
  const { path } = await context.params;
  const queryString = request.nextUrl.search;
  const targetUrl = `${process.env.SPRING_API_URL}/${path.join("/")}${queryString}`;

  // 3. Forward request with same method and body; inject Authorization header
  const method = request.method;
  const hasBody = method === "POST" || method === "PUT" || method === "PATCH";
  const incomingContentType = request.headers.get("content-type") ?? "";
  const isMultipart = incomingContentType.includes("multipart/form-data");

  let upstreamRes: Response;
  try {
    if (hasBody && isMultipart) {
      // Do NOT set Content-Type — fetch adds multipart/form-data; boundary=...
      const body = await rebuildMultipartFormData(request);
      upstreamRes = await fetch(targetUrl, {
        method,
        headers: {
          Authorization: `Bearer ${session.jwt}`,
        },
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

  // 5. If Spring Boot returns 401 → destroy session and surface 401
  if (upstreamRes.status === 401) {
    session.destroy();
    return NextResponse.json({ message: "Session expired" }, { status: 401 });
  }

  // 4. Return Spring Boot response body as-is — jwt is never in response body.
  // Binary endpoints (PDF/Excel/zip/images) must be forwarded as bytes; parsing as
  // JSON corrupts the payload (e.g. examResultPDF for Consolidated Exam Report).
  const upstreamContentType = upstreamRes.headers.get("content-type") ?? "";
  const isJsonResponse =
    /json/i.test(upstreamContentType) ||
    upstreamContentType.startsWith("text/") ||
    upstreamContentType === "";

  if (!isJsonResponse) {
    const buffer = await upstreamRes.arrayBuffer();
    const headers = new Headers();
    headers.set("Content-Type", upstreamContentType);
    const disposition = upstreamRes.headers.get("content-disposition");
    if (disposition) headers.set("Content-Disposition", disposition);
    return new NextResponse(buffer, { status: upstreamRes.status, headers });
  }

  const data = await upstreamRes.json().catch(() => null);
  return NextResponse.json(data, { status: upstreamRes.status });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
