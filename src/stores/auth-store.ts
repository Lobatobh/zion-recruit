import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface AuthState {
  // UI State
  isLoading: boolean;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // User State (cached for quick access)
  currentOrganizationId: string | null;
  organizations: Organization[];

  // Actions
  setIsLoading: (loading: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentOrganization: (orgId: string | null) => void;
  setOrganizations: (orgs: Organization[]) => void;
  reset: () => void;
}

const initialState = {
  isLoading: false,
  sidebarOpen: true,
  sidebarCollapsed: false,
  currentOrganizationId: null,
  organizations: [],
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setIsLoading: (loading) => set({ isLoading: loading }),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleSidebar: () => {
        const current = get().sidebarOpen;
        set({ sidebarOpen: !current });
      },

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setCurrentOrganization: (orgId) =>
        set({ currentOrganizationId: orgId }),

      setOrganizations: (orgs) => set({ organizations: orgs }),

      reset: () => set(initialState),
    }),
    {
      name: "zion-recruit-auth-store",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        currentOrganizationId: state.currentOrganizationId,
      }),
    }
  )
);
