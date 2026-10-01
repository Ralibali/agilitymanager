/** Dependencies are server-side only. A body-supplied user ID is never accepted. */
export interface AccountDeletionBackend {
  getUser: (jwt: string) => Promise<{ id: string } | null>;
  preflight: (userId: string, sessionId: string) => Promise<"ready" | "inactive_session" | "not_ready">;
  revokeSessions: (jwt: string) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  userIsDeleted: (userId: string) => Promise<boolean>;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function response(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Only read signed claims after getUser has verified the JWT with Auth. */
function sessionIdFromVerifiedJwt(jwt: string, userId: string): string | null {
  try {
    const payload = jwt.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    return claims.sub === userId && typeof claims.session_id === "string" && UUID.test(claims.session_id)
      ? claims.session_id
      : null;
  } catch {
    return null;
  }
}

export function createAccountDeletionHandler(backend: AccountDeletionBackend) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
    const jwt = request.headers.get("Authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!jwt) return response({ error: "sign_in_required" }, 401);
    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
      return response({ error: "invalid_request" }, 400);
    }

    // Read a bounded stream, so a forged Content-Length cannot bypass the limit.
    const reader = request.body?.getReader();
    if (!reader) return response({ error: "invalid_request" }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 1024) {
          await reader.cancel();
          return response({ error: "invalid_request" }, 413);
        }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const body = JSON.parse(new TextDecoder().decode(bytes));
      if (!body || Array.isArray(body) || Object.keys(body).length !== 1 || body.confirmation !== "RADERA") {
        return response({ error: "confirmation_required" }, 400);
      }
    } catch {
      return response({ error: "invalid_request" }, 400);
    }

    try {
      const user = await backend.getUser(jwt);
      if (!user || !UUID.test(user.id)) return response({ error: "sign_in_required" }, 401);
      const sessionId = sessionIdFromVerifiedJwt(jwt, user.id);
      if (!sessionId) return response({ error: "sign_in_required" }, 401);
      const readiness = await backend.preflight(user.id, sessionId);
      if (readiness === "inactive_session") return response({ error: "sign_in_required" }, 401);
      if (readiness !== "ready") return response({ error: "deletion_not_ready" }, 503);
      // Revoke refresh tokens before hard deletion. Access tokens expire independently.
      if (!await backend.revokeSessions(jwt)) return response({ error: "session_revocation_failed" }, 503);
      if (!await backend.deleteUser(user.id)) return response({ error: "deletion_failed" }, 503);
      // Never claim success after an ambiguous backend response.
      if (!await backend.userIsDeleted(user.id)) return response({ error: "deletion_unconfirmed" }, 503);
      return response({ deleted: true }, 200);
    } catch {
      // Do not return IDs, credentials, database errors, or personal data to the client.
      return response({ error: "deletion_unavailable" }, 503);
    }
  };
}
