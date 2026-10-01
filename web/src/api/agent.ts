// Agent observability API — read-only intelligence (no chat, no controls).
import { apiGet } from "./client";
import type { AgentEvent, AgentStatus, ScoreBreakdown, Signal, SystemStatus } from "../types/trading";

export function fetchAgentStatus(): Promise<AgentStatus> {
  return apiGet.get<AgentStatus>("/api/agent/status");
}

export function fetchAgentEvents(limit = 30): Promise<AgentEvent[]> {
  return apiGet.get<AgentEvent[]>(`/api/agent/events?limit=${limit}`);
}

export function fetchScore(symbol: string): Promise<ScoreBreakdown> {
  return apiGet.get<ScoreBreakdown>(`/api/score/${encodeURIComponent(symbol)}`);
}

export function fetchSignal(symbol: string): Promise<Signal> {
  return apiGet.get<Signal>(`/api/signal/${encodeURIComponent(symbol)}`);
}

export function fetchSystemStatus(): Promise<SystemStatus> {
  return apiGet.get<SystemStatus>("/api/status");
}
