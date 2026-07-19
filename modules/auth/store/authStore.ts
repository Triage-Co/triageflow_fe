import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AuthUser, StaffRole, UserProfile, UpdateProfileRequest } from '@/shared/types/auth.types';
import { authService } from '../services/authService';

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
    /** User profile details fetched from profile API */
    profile: UserProfile | null;
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
        profile?: UserProfile | null;
    }) => void;

    /** Clear all auth state and tokens from storage */
    logout: () => void;

    /** Reset to initial state */
    reset: () => void;

    /** Fetch current user's profile details */
    fetchProfile: (token: string) => Promise<void>;

    /** Update current user's profile details */
    updateProfile: (data: UpdateProfileRequest, token: string) => Promise<void>;

    /** Clear any error messages */
    clearError: () => void;

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
    profile: null,
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
                loginSuccess: ({ user, accessToken, refreshToken, profile }) =>
                    set(
                        { user, accessToken, refreshToken, profile: profile || null, error: null, isLoading: false },
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
                        { user: null, accessToken: null, refreshToken: null, error: null, profile: null },
                        false,
                        'logout',
                    );
                },

                reset: () => set(initialState, false, 'reset'),

                fetchProfile: async (token: string) => {
                    set({ isLoading: true, error: null }, false, 'fetchProfile/pending');
                    try {
                        const res = await authService.getProfile(token);
                        if (res && res.data) {
                            const currentUser = get().user;
                            const updatedUser = currentUser && res.data.user_name
                                ? {
                                      ...currentUser,
                                      fullName: res.data.user_name,
                                      avatar: res.data.avatar || undefined,
                                  }
                                : currentUser;
                            set({ profile: res.data, user: updatedUser, isLoading: false }, false, 'fetchProfile/success');
                        } else {
                            set({ profile: null, isLoading: false }, false, 'fetchProfile/empty');
                        }
                    } catch (err) {
                        set({
                            error: err instanceof Error ? err.message : 'Không thể tải thông tin nhân viên.',
                            isLoading: false,
                        }, false, 'fetchProfile/failure');
                        throw err;
                    }
                },

                updateProfile: async (data: UpdateProfileRequest, token: string) => {
                    set({ isLoading: true, error: null }, false, 'updateProfile/pending');
                    try {
                        const res = await authService.updateProfile(data, token);
                        if (res && res.data) {
                            // Update profile and user info in state
                            const currentUser = get().user;
                            const updatedUser = currentUser && res.data.user_name
                                ? {
                                      ...currentUser,
                                      fullName: res.data.user_name,
                                      avatar: res.data.avatar || undefined,
                                  }
                                : currentUser;
                            set({
                                profile: res.data,
                                user: updatedUser,
                                isLoading: false
                            }, false, 'updateProfile/success');
                        } else {
                            set({ isLoading: false }, false, 'updateProfile/empty');
                        }
                    } catch (err) {
                        set({
                            error: err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu cấu hình.',
                            isLoading: false,
                        }, false, 'updateProfile/failure');
                        throw err;
                    }
                },

                clearError: () => set({ error: null }, false, 'clearError'),

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
                    profile: state.profile,
                }),
            },
        ),
        { name: 'AuthStore' },
    ),
);
