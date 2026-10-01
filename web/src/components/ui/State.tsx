import { GatewayError } from "../../api/client";

export function Loading({ text }: { text: string }) {
  return (
    <div role="status" aria-live="polite" className="py-6 text-center text-sm text-muted">
      {text}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div role="status" className="py-6 text-center text-sm text-muted">
      {text}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message =
    error instanceof GatewayError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Unable to load data.";
  const unavailable = error instanceof GatewayError && error.unavailable;
  return (
    <div role="alert" className="py-6 text-center">
      <p className="text-sm font-medium text-ink">
        {unavailable ? "Data unavailable" : "Unable to load data."}
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:bg-wash"
      >
        Retry
      </button>
    </div>
  );
}
