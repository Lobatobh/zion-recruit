import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applyRateLimit } from "@/lib/rate-limit";

// GET /api/public/sitemap - Generate XML sitemap for SEO
export async function GET(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(req, "PUBLIC");
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: rateLimitResult.error },
      { status: 429 }
    );
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://zion-recruit.com";

    // Get all public jobs
    const jobs = await db.job.findMany({
      where: {
        isPublic: true,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        publicSlug: true,
        title: true,
        updatedAt: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: "desc" },
    });

    // Get tenant info for organization branding
    const tenants = await db.tenant.findMany({
      where: {
        jobs: {
          some: {
            isPublic: true,
            status: "PUBLISHED",
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        updatedAt: true,
      },
    });

    // Build sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Job Board Main Page -->
  <url>
    <loc>${baseUrl}/?view=careers</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>

  <!-- Individual Job Pages -->
${jobs.map((job) => {
  const jobUrl = job.publicSlug 
    ? `${baseUrl}/?view=careers&job=${job.publicSlug}`
    : `${baseUrl}/?view=careers&job=${job.id}`;
  const lastMod = (job.updatedAt || job.publishedAt || new Date()).toISOString().split('T')[0];
  return `  <url>
    <loc>${jobUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${lastMod}</lastmod>
  </url>`;
}).join('\n')}

  <!-- Organization Career Pages -->
${tenants.map((tenant) => {
  const orgUrl = `${baseUrl}/?view=careers&org=${tenant.slug}`;
  const lastMod = tenant.updatedAt.toISOString().split('T')[0];
  return `  <url>
    <loc>${orgUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <lastmod>${lastMod}</lastmod>
  </url>`;
}).join('\n')}
</urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return NextResponse.json(
      { error: "Failed to generate sitemap" },
      { status: 500 }
    );
  }
}
