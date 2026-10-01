import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { fetchMarkets } from "../../api/pacifica";
import { Card } from "../ui/Card";

/** Configure which symbols appear on the dashboard strip and focus switcher. */
export function WatchlistManager({
  watchlist,
  add,
  remove,
  reset,
}: {
  watchlist: string[];
  add: (s: string) => void;
  remove: (s: string) => void;
  reset: () => void;
}) {
  const [draft, setDraft] = useState("");
  const all = useQuery({ queryKey: ["markets"], queryFn: fetchMarkets, staleTime: 60_000 });
  const options = (all.data ?? []).map((m) => m.symbol).filter((s) => !watchlist.includes(s));
  const suggestions = draft
    ? options.filter((s) => s.includes(draft.trim().toUpperCase())).slice(0, 8)
    : [];

  return (
    <Card
      title="Watchlist"
      action={
        <button type="button" onClick={reset} className="text-xs font-semibold text-teal hover:underline">
          Reset to BTC · ETH · SOL
        </button>
      }
    >
      <div className="flex flex-wrap gap-1.5" aria-label="Watched symbols">
        {watchlist.length === 0 && <span className="text-xs text-muted">Nothing watched — add symbols below.</span>}
        {watchlist.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold dark:bg-slate-800"
          >
            {s}
            <button
              type="button"
              onClick={() => remove(s)}
              aria-label={`Remove ${s} from watchlist`}
              className="text-muted hover:text-ink"
            >
              <X size={12} aria-hidden />
            </button>
          </span>
        ))}
      </div>
      <form
        className="relative mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) {
            add(draft.trim());
            setDraft("");
          }
        }}
      >
        <label htmlFor="watch-add" className="sr-only">
          Add a Pacifica symbol to the watchlist
        </label>
        <input
          id="watch-add"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add symbol — e.g. HYPE"
          autoComplete="off"
          spellCheck={false}
          className="w-48 max-w-full rounded border border-line bg-paper px-2 py-1 font-mono text-xs"
        />
        <button type="submit" className="rounded border border-line px-3 py-1 text-xs font-semibold">
          Add
        </button>
        {suggestions.length > 0 && (
          <ul className="absolute left-0 top-full z-10 mt-1 w-48 rounded border border-line bg-paper shadow">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="block w-full px-2 py-1 text-left font-mono text-xs hover:bg-wash"
                  onClick={() => {
                    add(s);
                    setDraft("");
                  }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>
    </Card>
  );
}
