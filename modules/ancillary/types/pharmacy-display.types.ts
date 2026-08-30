export interface PharmacyDisplayRoom {
    room_id: string;
    room_name: string;
    room_type?: string;
}

export interface PharmacyCallingNumber {
    prescription_id: string;
    pickup_number: string;
    display_screen_id?: string | null;
}

export interface PharmacyDisplayPayload {
    kind: 'pharmacy';
    room: PharmacyDisplayRoom;
    calling_numbers: PharmacyCallingNumber[];
    missed_numbers?: PharmacyCallingNumber[];
    ready_unshown_count: number;
    removed_ids?: string[];
}

export function isPharmacyNumberOnTv(input: {
    status?: string;
    called_at?: string | null;
    missed_at?: string | null;
}): boolean {
    return (
        input.status === 'PREPARED' &&
        Boolean(input.called_at) &&
        !input.missed_at
    );
}

export function isPharmacyNumberReadyToCall(input: {
    status?: string;
    called_at?: string | null;
    missed_at?: string | null;
    pickup_number?: string | null;
}): boolean {
    return (
        input.status === 'PREPARED' &&
        Boolean(input.pickup_number) &&
        !input.called_at &&
        !input.missed_at
    );
}

export function isPharmacyNumberMissed(input: {
    status?: string;
    missed_at?: string | null;
}): boolean {
    return input.status === 'PREPARED' && Boolean(input.missed_at);
}
