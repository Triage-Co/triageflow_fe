import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AuthUser, StaffRole } from '@/shared/types/auth.types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuthState {
    /** Current authenticated user (null when logged out) */
    user: AuthUser | null;
    /** JWT access token */
    accessToken: string | null;
    /** JWT refresh token */
    refreshToken: string | null;
    /** Whether an auth operation is in progress */
    isLoading: boolean;
    /** Last auth error message */
    error: string | null;
    /** Whether the user chose "remember me" at login */
    rememberMe: boolean;
}

export interface AuthActions {
    // ── Setters ──
    setUser: (user: AuthUser) => void;
    setTokens: (accessToken: string, refreshToken: string) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setRememberMe: (rememberMe: boolean) => void;

    // ── Compound actions ──
    /** Store user + tokens after a successful login */
    loginSuccess: (payload: {
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
    }) => void;

    /** Clear all auth state and tokens from storage */
    logout: () => void;

    /** Reset to initial state */
    reset: () => void;

    // ── Selectors (derived) ──
    /** Whether the user is authenticated */
    isAuthenticated: () => boolean;

    /** Current user role (or empty string) */
    getRole: () => StaffRole | string;
}

type AuthStore = AuthState & AuthActions;

// ── Initial state ────────────────────────────────────────────────────────────

const initialState: AuthState = {
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: false,
    error: null,
    rememberMe: false,
};

// ── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
    devtools(
        persist(
            (set, get) => ({
                ...initialState,

                // ── Setters ──────────────────────────────────────────────
                setUser: (user) => set({ user, error: null }, false, 'setUser'),

                setTokens: (accessToken, refreshToken) =>
                    set({ accessToken, refreshToken }, false, 'setTokens'),

                setLoading: (isLoading) =>
                    set({ isLoading }, false, 'setLoading'),

                setError: (error) =>
                    set({ error }, false, 'setError'),

                setRememberMe: (rememberMe) =>
                    set({ rememberMe }, false, 'setRememberMe'),

                // ── Compound actions ─────────────────────────────────────
                loginSuccess: ({ user, accessToken, refreshToken }) =>
                    set(
                        { user, accessToken, refreshToken, error: null, isLoading: false },
                        false,
                        'loginSuccess',
                    ),

                logout: () => {
                    // Clear legacy token keys (used before this store managed tokens)
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    sessionStorage.removeItem('accessToken');
                    sessionStorage.removeItem('refreshToken');

                    set(
                        { user: null, accessToken: null, refreshToken: null, error: null },
                        false,
                        'logout',
                    );
                },

                reset: () => set(initialState, false, 'reset'),

                // ── Selectors ────────────────────────────────────────────
                isAuthenticated: () => get().user !== null && get().accessToken !== null,

                getRole: () => get().user?.role ?? '',
            }),
            {
                name: 'auth-storage',
                // Only persist these keys (not loading/error)
                partialize: (state) => ({
                    user: state.user,
                    accessToken: state.accessToken,
                    refreshToken: state.refreshToken,
                    rememberMe: state.rememberMe,
                }),
            },
        ),
        { name: 'AuthStore' },
    ),
);
