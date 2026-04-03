"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";

type ViewType = string;

interface NavigationContextType {
  currentView: ViewType;
  params: Record<string, string>;
  navigate: (view: ViewType, extraParams?: Record<string, string>) => void;
  getParam: (key: string) => string;
}

const NavigationContext = createContext<NavigationContextType>({
  currentView: "overview",
  params: {},
  navigate: () => {},
  getParam: () => "",
});

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    if (typeof window === "undefined") return "overview";
    const params = new URLSearchParams(window.location.search);
    return params.get("view") || "overview";
  });

  const [params, setParams] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const searchParams = new URLSearchParams(window.location.search);
    const result: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key !== "view") result[key] = value;
    });
    return result;
  });

  // Listen for URL changes (back/forward + router.push from other components)
  const lastUrlRef = useRef(window.location.search);

  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      setCurrentView(searchParams.get("view") || "overview");
      const newParams: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        if (key !== "view") newParams[key] = value;
      });
      setParams(newParams);
      lastUrlRef.current = window.location.search;
    };

    // Poll for URL changes (catches router.push from child components)
    const interval = setInterval(() => {
      if (window.location.search !== lastUrlRef.current) {
        lastUrlRef.current = window.location.search;
        handlePopState();
      }
    }, 150);

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      clearInterval(interval);
    };
  }, []);

  const navigate = useCallback((view: ViewType, extraParams?: Record<string, string>) => {
    setCurrentView(view);
    setParams(extraParams || {});

    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    // Remove old extra params
    Array.from(url.searchParams.keys()).forEach((key) => {
      if (key !== "view") url.searchParams.delete(key);
    });
    // Add new extra params
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    window.history.pushState({}, "", url.pathname + url.search);
    lastUrlRef.current = url.search;
  }, []);

  const getParam = useCallback((key: string) => {
    return params[key] || "";
  }, [params]);

  return (
    <NavigationContext.Provider value={{ currentView, params, navigate, getParam }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}

export function useCurrentView() {
  const { currentView } = useContext(NavigationContext);
  return currentView;
}

export function useNavParam(key: string) {
  const { getParam } = useContext(NavigationContext);
  return getParam(key);
}
