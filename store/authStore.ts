// Re-export auth store from the auth module.
// All auth logic lives in modules/auth/store/authStore.ts
export { useAuthStore } from '@/modules/auth/store/authStore';
export type { AuthState, AuthActions } from '@/modules/auth/store/authStore';
