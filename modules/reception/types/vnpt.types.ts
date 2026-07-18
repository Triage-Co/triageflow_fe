export interface VnptKeyPayload {
    backend_url?: string;
    backendUrl?: string;
    BACKEND_URL?: string;
    token_key?: string;
    tokenKey?: string;
    TOKEN_KEY?: string;
    token_id?: string;
    tokenId?: string;
    TOKEN_ID?: string;
    access_token?: string;
    accessToken?: string;
    ACCESS_TOKEN?: string;
    public_key_ca?: string;
    publicKeyCa?: string;
    PUBLIC_KEY_CA?: string;
}

export interface VnptCredentials {
    backendUrl: string;
    tokenKey: string;
    tokenId: string;
    accessToken?: string;
    publicKeyCa?: string;
}
