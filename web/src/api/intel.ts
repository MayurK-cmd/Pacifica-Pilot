import { apiGet, GatewayError } from "./client";
import type { DailyDigest, IntelAction, IntelReply } from "../types/trading";

export async function askIntel(opts: {
  message?: string;
  action?: IntelAction;
  symbol?: string;
  sessionId?: string | null;
}): Promise<IntelReply> {
  const res = await fetch("/api/agents/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      ...(opts.message ? { message: opts.message } : {}),
      ...(opts.action ? { action: opts.action } : {}),
      ...(opts.symbol ? { symbol: opts.symbol } : {}),
      ...(opts.sessionId ? { sessionId: opts.sessionId } : {}),
      speed: "fast",
    }),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let unavailable = res.status === 503;
    try {
      const body = (await res.json()) as { error?: string; unavailable?: boolean };
      if (body.error) message = body.error;
      if (body.unavailable) unavailable = true;
    } catch {
      // keep default
    }
    throw new GatewayError(res.status, message, unavailable);
  }
  return (await res.json()) as IntelReply;
}

export function fetchDigest(): Promise<DailyDigest> {
  return apiGet.get<DailyDigest>("/api/digest");
}
