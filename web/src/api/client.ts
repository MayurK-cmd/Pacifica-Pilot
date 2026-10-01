// Typed gateway client. Browser calls same-origin /api/* only;
// the gateway (web/server) holds all provider keys. See docs/WEB.md §9.

export class GatewayError extends Error {
  status: number;
  unavailable: boolean;
  constructor(status: number, message: string, unavailable = false) {
    super(message);
    this.status = status;
    this.unavailable = unavailable;
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let unavailable = res.status === 503;
    try {
      const body = (await res.json()) as { error?: string; unavailable?: boolean };
      if (body.error) message = body.error;
      if (body.unavailable) unavailable = true;
    } catch {
      // keep default message
    }
    throw new GatewayError(res.status, message, unavailable);
  }
  return (await res.json()) as T;
}

export const apiGet = { get };
