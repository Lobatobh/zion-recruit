/**
 * BrasilAPI Proxy - Zion Recruit
 * Proxies requests to BrasilAPI (brasilapi.com.br) to avoid CORS issues.
 * Supported endpoints:
 *   /api/brasilapi/cnpj/v1/{cnpj}
 *   /api/brasilapi/cep/v2/{cep}
 *   /api/brasilapi/ddd/v1/{ddd}
 */

import { NextRequest, NextResponse } from "next/server";

const BRASILAPI_BASE = "https://brasilapi.com.br/api";

const ALLOWED_PREFIXES = ["/cnpj/", "/cep/", "/ddd/"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const apiPath = "/" + pathSegments.join("/");

    // Validate that the path starts with an allowed prefix
    const isAllowed = ALLOWED_PREFIXES.some((prefix) =>
      apiPath.startsWith(prefix)
    );

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Endpoint not allowed" },
        { status: 403 }
      );
    }

    const url = `${BRASILAPI_BASE}${apiPath}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: errorData.message || `BrasilAPI error: ${response.status}`,
          type: errorData.type || "api_error",
        },
        { status: response.status === 404 ? 404 : response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Timeout ao consultar BrasilAPI", type: "timeout" },
        { status: 504 }
      );
    }

    console.error("BrasilAPI proxy error:", error);
    return NextResponse.json(
      { error: "Erro ao consultar BrasilAPI" },
      { status: 500 }
    );
  }
}
