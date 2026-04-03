/**
 * Public DISC Test Page Route
 * Accessible without authentication via /disc?testId=xxx
 */

"use client";

import { Suspense } from "react";
import { PublicDISCTest } from "@/components/disc/public-disc-test";
import { Loader2 } from "lucide-react";

function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando teste...</p>
      </div>
    </div>
  );
}

export default function DiscPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PublicDISCTest />
    </Suspense>
  );
}
