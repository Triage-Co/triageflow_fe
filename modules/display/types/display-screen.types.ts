export type DisplayScreenKind = 'KIOSK' | 'TV_CLINIC' | 'TV_PHARMACY' | 'TV_PAYMENT';

export type DisplayScreenStatus = 'ENABLED' | 'DISABLED';

export interface DisplayScreenSpecialty {
  specialty_id: string;
  specialty_code: string;
  specialty_name: string;
}

export interface DisplayScreenRoom {
  room_id: string;
  room_name: string;
  room_type?: string;
  specialty?: DisplayScreenSpecialty | null;
}

export interface KioskScreenSettings {
  enable_otp?: boolean;
  floor_number?: number;
  start_room_code?: string;
  start_room_label?: string;
}

export interface PharmacyTvSettings {
  media_enabled?: boolean;
  sound_enabled?: boolean;
}

export type DisplayScreenSettings = KioskScreenSettings &
  PharmacyTvSettings &
  Record<string, unknown>;

export interface DisplayScreen {
  display_screen_id: string;
  code: string;
  name: string;
  kind: DisplayScreenKind;
  status: DisplayScreenStatus;
  room_id: string | null;
  settings: DisplayScreenSettings;
  created_at: string;
  updated_at: string;
  room?: DisplayScreenRoom | null;
}

export interface CreateDisplayScreenDto {
  code: string;
  name: string;
  kind: DisplayScreenKind;
  status?: DisplayScreenStatus;
  room_id?: string | null;
  settings?: DisplayScreenSettings;
}

export interface UpdateDisplayScreenDto {
  code?: string;
  name?: string;
  status?: DisplayScreenStatus;
  room_id?: string | null;
  settings?: DisplayScreenSettings;
}

export interface VerifyDisplayPinResult {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface DisplayBindState {
  display_screen_id: string;
  kind: DisplayScreenKind;
}

export const DISPLAY_KIND_LABEL: Record<DisplayScreenKind, string> = {
  KIOSK: 'Kiosk',
  TV_CLINIC: 'TV phòng khám',
  TV_PHARMACY: 'TV nhà thuốc',
  TV_PAYMENT: 'TV thanh toán',
};

export const DISPLAY_ROUTE_BY_KIND: Record<DisplayScreenKind, string> = {
  KIOSK: '/kiosk',
  TV_CLINIC: '/display/room',
  TV_PHARMACY: '/display/pharmacy',
  TV_PAYMENT: '/display/payment',
};

export function screenHref(screen: Pick<DisplayScreen, 'display_screen_id' | 'kind'>): string {
  return `${DISPLAY_ROUTE_BY_KIND[screen.kind]}/${screen.display_screen_id}`;
}

export function isKioskSettings(settings: DisplayScreenSettings): KioskScreenSettings {
  return settings;
}

export function readBooleanSetting(settings: DisplayScreenSettings, key: string, fallback: boolean): boolean {
  const value = settings[key];
  if (typeof value === 'boolean') return value;
  return fallback;
}

export function readNumberSetting(settings: DisplayScreenSettings, key: string, fallback: number): number {
  const value = settings[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function readStringSetting(settings: DisplayScreenSettings, key: string, fallback = ''): string {
  const value = settings[key];
  return typeof value === 'string' ? value : fallback;
}
