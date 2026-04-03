import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zion Recruit - AI-Powered Recruitment Platform",
  description: "Multi-tenant AI-powered recruitment SaaS. Streamline your hiring process with intelligent candidate matching and pipeline management.",
  keywords: ["Zion Recruit", "Recruitment", "AI", "HR", "Hiring", "Talent Acquisition"],
  authors: [{ name: "Zion Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Zion Recruit",
    description: "AI-powered recruitment platform for modern teams",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
