import { createSign, createPrivateKey, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

export interface FcmSendResult {
  ok: boolean;
  /** FCM error code (UNREGISTERED, INVALID_ARGUMENT, …) */
  errorCode?: string;
  status?: number;
}

interface ServiceAccountJson {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

function readServiceAccount(credentialsPath: string): ServiceAccountJson {
  const raw = readFileSync(credentialsPath, 'utf8');
  const parsed = JSON.parse(raw) as ServiceAccountJson;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('FCM service account JSON incomplete');
  }
  return parsed;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getAccessToken(credentialsPath: string): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAtMs > now + 60_000) {
    return cachedAccessToken.token;
  }

  const sa = readServiceAccount(credentialsPath);
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: tokenUri,
      iat,
      exp,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const key = createPrivateKey(sa.private_key);
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key);
  const assertion = `${unsigned}.${base64url(signature)}`;

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM OAuth failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error('FCM OAuth: access_token yoxdur');
  }

  const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 3600;
  cachedAccessToken = {
    token: json.access_token,
    expiresAtMs: now + expiresIn * 1000,
  };
  return json.access_token;
}

/** Legacy FCM HTTP API (server key) */
export async function sendFcmLegacy(input: {
  serverKey: string;
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<FcmSendResult> {
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${input.serverKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: input.token,
      notification: { title: input.title, body: input.body },
      data: input.data,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    success?: number;
    failure?: number;
    results?: Array<{ error?: string }>;
  };

  if (!res.ok) {
    return { ok: false, status: res.status, errorCode: `HTTP_${res.status}` };
  }

  const err = json.results?.[0]?.error;
  if (err) {
    return { ok: false, status: res.status, errorCode: err };
  }
  return { ok: true, status: res.status };
}

/** FCM HTTP v1 */
export async function sendFcmHttpV1(input: {
  projectId: string;
  credentialsPath: string;
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<FcmSendResult> {
  const accessToken = await getAccessToken(input.credentialsPath);
  const url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(input.projectId)}/messages:send`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Request-Id': randomUUID(),
    },
    body: JSON.stringify({
      message: {
        token: input.token,
        notification: { title: input.title, body: input.body },
        data: input.data,
        webpush: {
          headers: { Urgency: 'high' },
          notification: { title: input.title, body: input.body },
        },
      },
    }),
  });

  if (res.ok) {
    return { ok: true, status: res.status };
  }

  const errBody = (await res.json().catch(() => ({}))) as {
    error?: { details?: Array<{ errorCode?: string }>; status?: string; message?: string };
  };
  const errorCode =
    errBody.error?.details?.find((d) => d.errorCode)?.errorCode ||
    errBody.error?.status ||
    `HTTP_${res.status}`;

  return { ok: false, status: res.status, errorCode };
}

/** Test helper — OAuth cache sıfırla */
export function clearFcmAccessTokenCache(): void {
  cachedAccessToken = null;
}
