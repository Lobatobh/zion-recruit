"use client";

import Script from "next/script";

interface JobSEOProps {
  job?: {
    id: string;
    title: string;
    publicSlug: string | null;
    department: string | null;
    description: string;
    location: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    type: string;
    workModel: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string;
    publishedAt: string | null;
    expiresAt: string | null;
    tenant: {
      name: string;
      logo: string | null;
    };
  } | null;
}

export function JobSEO({ job }: JobSEOProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://zion-recruit.com";
  
  if (!job) {
    // Job Board SEO
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Zion Recruit - Vagas de Emprego",
      "description": "Encontre as melhores oportunidades de emprego em tecnologia",
      "url": `${baseUrl}/?view=careers`,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${baseUrl}/?view=careers&search={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    };

    return (
      <>
        <Script
          id="job-board-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </>
    );
  }

  // Individual Job SEO
  const getLocation = () => {
    const parts = [job.city, job.state, job.country].filter(Boolean);
    return parts.join(", ") || job.location || "Remote";
  };

  const getSalaryRange = () => {
    if (!job.salaryMin && !job.salaryMax) return null;
    
    const currencyMap: Record<string, string> = {
      BRL: "BRL",
      USD: "USD",
      EUR: "EUR",
    };

    return {
      "@type": "MonetaryAmount",
      "currency": currencyMap[job.currency] || job.currency,
      "value": {
        "@type": "QuantitativeValue",
        ...(job.salaryMin && { "minValue": job.salaryMin }),
        ...(job.salaryMax && { "maxValue": job.salaryMax }),
        "unitText": "MONTH"
      }
    };
  };

  const jobUrl = job.publicSlug 
    ? `${baseUrl}/?view=careers&job=${job.publicSlug}`
    : `${baseUrl}/?view=careers&job=${job.id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.description.replace(/<[^>]*>/g, ""),
    "identifier": {
      "@type": "PropertyValue",
      "name": job.tenant.name,
      "value": job.id
    },
    "datePosted": job.publishedAt || new Date().toISOString(),
    ...(job.expiresAt && { "validThrough": job.expiresAt }),
    "employmentType": job.type.replace("_", "").toUpperCase(),
    "hiringOrganization": {
      "@type": "Organization",
      "name": job.tenant.name,
      ...(job.tenant.logo && { "logo": job.tenant.logo }),
      "sameAs": baseUrl
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": job.city || "",
        "addressRegion": job.state || "",
        "addressCountry": job.country || "Brasil"
      }
    },
    ...(getSalaryRange() && { "baseSalary": getSalaryRange() }),
    "url": jobUrl
  };

  // Open Graph data for the page component
  return (
    <>
      <Script
        id="job-posting-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}

// Helper to generate metadata for pages
export function generateJobMetadata(job: NonNullable<JobSEOProps['job']>) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://zion-recruit.com";
  const jobUrl = job.publicSlug 
    ? `${baseUrl}/?view=careers&job=${job.publicSlug}`
    : `${baseUrl}/?view=careers&job=${job.id}`;

  const location = [job.city, job.state, job.country].filter(Boolean).join(", ") || job.location || "Remote";

  return {
    title: `${job.title} - ${job.tenant.name} | Zion Recruit`,
    description: `${job.title} em ${location}. ${job.description.replace(/<[^>]*>/g, "").slice(0, 150)}...`,
    openGraph: {
      title: job.title,
      description: `${job.title} - ${job.tenant.name} em ${location}`,
      url: jobUrl,
      type: "article",
      ...(job.tenant.logo && { images: [{ url: job.tenant.logo }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: job.title,
      description: `${job.title} - ${job.tenant.name} em ${location}`,
      ...(job.tenant.logo && { images: [job.tenant.logo] }),
    },
  };
}
