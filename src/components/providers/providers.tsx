"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { useState, useEffect, useRef } from "react";

/**
 * ServerWatchdog - Monitors server health and auto-reloads when back online.
 * Detects when the dev server dies (sandbox timeout) and reloads when it comes back.
 */
function ServerWatchdog() {
  const isServerDownRef = useRef(false);
  const hasReloadedRef = useRef(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function checkHealth() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch("/api/health", { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok || res.status === 404) {
          if (isServerDownRef.current && !hasReloadedRef.current) {
            hasReloadedRef.current = true;
            if (checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current);
              checkIntervalRef.current = null;
            }
            window.location.reload();
          }
          return;
        }
      } catch {
        // Server unreachable
      }

      if (!isServerDownRef.current) {
        isServerDownRef.current = true;
        if (!checkIntervalRef.current) {
          checkIntervalRef.current = setInterval(checkHealth, 3000);
        }
      }
    }

    const initTimer = setTimeout(checkHealth, 5000);
    const normalTimer = setInterval(checkHealth, 30000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(normalTimer);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <>
      <ServerWatchdog />
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </QueryClientProvider>
      </SessionProvider>
    </>
  );
}
