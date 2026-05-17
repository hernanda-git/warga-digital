import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearHeaderProfileCookie } from "@/lib/header-profile-cookie";

interface UserInfo {
  id: string;
  fullName: string;
}

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  /** Whether the current user holds an admin role. Persisted so it's available
   *  immediately on first paint — no need to wait for /api/profile on every load. */
  isAdmin: boolean;
  /** Sidebar logo URL from app settings. Persisted so it shows instantly on first
   *  paint and updates reactively when changed via the branding admin page. */
  logoUrl: string | null;
  setUser: (user: UserInfo | null) => void;
  setAdminRole: (isAdmin: boolean) => void;
  setLogoUrl: (url: string | null) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      logoUrl: null,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAdminRole: (isAdmin) => set({ isAdmin }),
      setLogoUrl: (logoUrl) => set({ logoUrl }),
      clearUser: () => {
        clearHeaderProfileCookie();
        set({
          user: null,
          isAuthenticated: false,
          isAdmin: false,
          logoUrl: null,
        });
      },
    }),
    { name: "warga-auth" },
  ),
);
