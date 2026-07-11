"""
PilotMemory — Supermemory wrapper for PacificaPilot.

Memory failure must NEVER block trading or crash the agent. Every call is
wrapped in try/except; on error we log silently and return empty/None. If
SUPERMEMORY_API_KEY is missing, the wrapper is disabled and every method
becomes a no-op (no exceptions, no log spam).

Container tags (do not invent others):
  - "decisions"   — AI trade decisions and outcomes
  - "patterns"    — Market observations
  - "preferences" — User stated preferences and config changes
  - "performance" — Daily/periodic performance summaries
  - "errors"      — Failures, API errors, fallback activations
"""

from __future__ import annotations

import logging
import os
import threading
from typing import List, Optional

logger = logging.getLogger("pacificapilot.memory")

CONTAINER_DECISIONS = "decisions"
CONTAINER_PATTERNS = "patterns"
CONTAINER_PREFERENCES = "preferences"
CONTAINER_PERFORMANCE = "performance"
CONTAINER_ERRORS = "errors"

VALID_CONTAINERS = {
    CONTAINER_DECISIONS,
    CONTAINER_PATTERNS,
    CONTAINER_PREFERENCES,
    CONTAINER_PERFORMANCE,
    CONTAINER_ERRORS,
}


class PilotMemory:
    """Best-effort wrapper around the Supermemory client.

    Methods return immediately with empty/None results when memory is
    disabled or errors. Trading code should call these without checking
    the return value — if they fail, the only consequence is a missing
    memory write, never a blocked trade.
    """

    def __init__(self, api_key: Optional[str] = None, mode: Optional[str] = None):
        """Initialise with optional explicit key + mode.

        Args:
            api_key: Supermemory API key. If None, read from env then secrets.env.
            mode: "local" or "cloud". If None, read from SUPERMEMORY_MODE env var
                  then secrets.env. Defaults to "local" if still unset.
        """
        # --- Resolve api_key ---
        if api_key is None:
            api_key = os.getenv("SUPERMEMORY_API_KEY")
        if not api_key:
            try:
                from ..storage.config import load_secrets
                secrets = load_secrets()
                api_key = secrets.get("SUPERMEMORY_API_KEY")
            except Exception:
                pass

        # --- Resolve mode ---
        if mode is None:
            mode = os.getenv("SUPERMEMORY_MODE", "")
        if not mode:
            try:
                from ..storage.config import load_secrets
                secrets = load_secrets()
                mode = secrets.get("SUPERMEMORY_MODE", "")
            except Exception:
                pass
        if not mode:
            mode = "cloud"

        mode = mode.lower()
        self.mode = mode
        self.enabled = bool(api_key)
        self._client = None

        if not self.enabled:
            return

        try:
            from supermemory import Supermemory  # type: ignore

            if mode == "local":
                base_url = os.getenv("SUPERMEMORY_LOCAL_URL", "http://localhost:6767")
                # Health check before committing to local mode.
                # The local server doesn't expose a /health endpoint, so we
                # hit the root (returns 200 with HTML) or any known path
                # (returns 404, which still proves the server is running).
                try:
                    import requests
                    resp = requests.get(base_url.rstrip("/") + "/", timeout=2)
                    # 200 (root) or 404 (any other path) both mean server is up
                    if resp.status_code >= 500:
                        raise ConnectionError(f"Local Supermemory returned {resp.status_code}")
                except Exception as err:
                    logger.debug("Local Supermemory unreachable at %s: %s", base_url, err)
                    print(
                        "[memory] Local Supermemory not reachable at "
                        f"{base_url}. "
                        "Run: npx supermemory local"
                    )
                    print("[memory] Memory disabled — trading continues normally")
                    self.enabled = False
                    return
                self._client = Supermemory(api_key=api_key, base_url=base_url)
            else:
                # Cloud mode — default SDK base URL
                self._client = Supermemory(api_key=api_key)
        except Exception as e:
            logger.debug("Supermemory init failed: %s", e)
            self.enabled = False
            self._client = None

    # --- Write ---------------------------------------------------------

    def add(self, content: str, container_tag: str, dreaming: str = "instant") -> None:
        """Persist a memory with a container tag. No-op if disabled or errored.

        Args:
            content: Memory text to store.
            container_tag: One of VALID_CONTAINERS.
            dreaming: "instant" (default) — processes the document immediately so
                it's searchable right away. "dynamic" batches related documents
                for efficient bulk processing.
        """
        if not self.enabled or self._client is None:
            return
        if not content or not container_tag:
            return
        try:
            self._client.add(content=content, container_tag=container_tag, dreaming=dreaming)
        except Exception as e:
            logger.debug("memory.add failed (%s): %s", container_tag, e)
            # Mark disabled to avoid hammering a broken endpoint
            self.enabled = False

    # --- Search --------------------------------------------------------

    def recall(
        self,
        query: str,
        container_tag: Optional[str] = None,
        limit: int = 5,
    ) -> List[str]:
        """Return a list of matching memory content strings. Empty on any error.

        Passes container_tags (plural list) to search.execute() because
        the Supermemory SDK uses the plural form for filtering — the singular
        container_tag is not supported by the search endpoint.

        If no container_tag is given, searches across all valid containers so
        the Chat Agent's natural language questions can find relevant memories
        regardless of which tag they were stored under.
        """
        if not self.enabled or self._client is None:
            return []
        if not query:
            return []
        try:
            kwargs = {"q": query, "limit": limit}
            if container_tag:
                kwargs["container_tags"] = [container_tag]
            else:
                # No tag means search everything the user has access to
                kwargs["container_tags"] = list(VALID_CONTAINERS)
            result = self._client.search.execute(**kwargs)
            return self._extract_contents(result)
        except Exception as e:
            logger.debug("memory.recall failed: %s", e)
            self.enabled = False
            return []

    # --- Profile / context --------------------------------------------

    def context(self, include_profile: bool = True, container_tag: Optional[str] = None) -> str:
        """Return a context string for system-prompt injection. Empty on any error.

        The Supermemory profile() endpoint requires a container_tag, so we call
        it for each of the active containers and merge the results into a single
        text block. This gives the Chat Agent session-start visibility into
        decisions, preferences, and patterns all at once.
        """
        if not self.enabled or self._client is None:
            return ""
        try:
            # If a specific tag was requested, query only that one
            tags = [container_tag] if container_tag else VALID_CONTAINERS

            parts = []
            for tag in tags:
                try:
                    kwargs: dict = {}
                    if include_profile:
                        kwargs["include"] = ["static", "dynamic", "buckets"]
                    kwargs["container_tag"] = tag
                    result = self._client.profile(**kwargs)
                    text = self._extract_profile_text(result)
                    if text:
                        parts.append(f"[{tag}]\n{text}")
                except Exception:
                    # One tag failing should not kill the whole context
                    continue

            return "\n\n".join(parts) if parts else ""
        except Exception as e:
            logger.debug("memory.context failed: %s", e)
            self.enabled = False
            return ""

    # --- Internals -----------------------------------------------------

    @staticmethod
    def _extract_contents(result) -> List[str]:
        """Pull content strings out of whatever shape the SDK returns."""
        if result is None:
            return []

        # SearchExecuteResponse — has .results (list of Result objects)
        results_attr = getattr(result, "results", None)
        if results_attr is None and isinstance(result, dict):
            results_attr = result.get("results")

        if results_attr is not None:
            contents: List[str] = []
            for hit in results_attr:
                text = PilotMemory._extract_hit_text(hit)
                if text:
                    contents.append(text)
            return contents

        # No usable results found
        return []

    @staticmethod
    def _extract_hit_text(hit) -> str:
        """Extract text content from a single search hit.

        The SDK returns Result objects where the actual content is nested:
          hit.chunks[0].content  (a list of ResultChunk objects)
        or directly as:
          hit.content  (but this is often None on the Result wrapper)
        """
        if hit is None:
            return ""

        # Dict path
        if isinstance(hit, dict):
            return (
                hit.get("content")
                or hit.get("text")
                or hit.get("memory")
                or ""
            )

        # Result.chunks — the primary content source
        chunks = getattr(hit, "chunks", None)
        if chunks:
            for chunk in chunks:
                text = (
                    getattr(chunk, "content", None)
                    or (chunk.get("content") if isinstance(chunk, dict) else None)
                    or ""
                )
                if text:
                    return str(text)

        # Direct attributes on the hit wrapper
        for attr in ("content", "text", "memory", "summary"):
            val = getattr(hit, attr, None)
            if val:
                return str(val)

        return ""

    @staticmethod
    def _extract_profile_text(result) -> str:
        """Pull a usable text block out of a profile response.

        The Supermemory SDK returns a ProfileResponse with a .profile
        attribute that is a Profile object containing:
          - buckets: dict[str, list[str]] — container-tagged memories
          - dynamic: list[str] — timeline of recent activity
          - static: list[str] — persistent user profile facts
        """
        if result is None:
            return ""

        if isinstance(result, dict):
            # Direct dict path
            profile_obj = result.get("profile") or result
            buckets = profile_obj.get("buckets", {})
            dynamic = profile_obj.get("dynamic", [])
            static = profile_obj.get("static", [])
        else:
            # Pydantic model path
            profile_obj = getattr(result, "profile", result)
            if profile_obj is None:
                return ""
            # Check if profile_obj itself has the fields we want
            buckets = getattr(profile_obj, "buckets", None)
            dynamic = getattr(profile_obj, "dynamic", None)
            static = getattr(profile_obj, "static", None)
            if buckets is None and dynamic is None and static is None:
                # The profile_obj might already be the leaf — try known attrs
                for attr in ("summary", "context", "static", "dynamic", "text"):
                    val = getattr(result, attr, None)
                    if val:
                        return str(val)
                return ""

        lines = []
        # static facts
        if static:
            for item in static:
                lines.append(f"  - {item}")
        # dynamic timeline
        if dynamic:
            lines.append("Recent activity:")
            for item in dynamic:
                lines.append(f"  - {item}")
        # bucket contents (preferences, patterns, etc.)
        if buckets:
            for tag_name, items in (
                buckets.items() if isinstance(buckets, dict)
                else {"items": buckets}.items()
            ):
                for item in items:
                    if isinstance(item, dict):
                        item = item.get("content", str(item))
                    lines.append(f"  - [{tag_name}] {item}")

        return "\n".join(lines)


# --- Singleton helper ------------------------------------------------

_singleton: Optional[PilotMemory] = None
_singleton_lock = threading.Lock()


def get_memory() -> PilotMemory:
    """Return a process-wide PilotMemory, creating it on first use."""
    global _singleton
    if _singleton is None:
        with _singleton_lock:
            if _singleton is None:
                _singleton = PilotMemory()
    return _singleton


def reset_memory(api_key: Optional[str] = None, mode: Optional[str] = None) -> PilotMemory:
    """Reinitialise the singleton (used after the user sets a new API key).

    Args:
        api_key: New API key, or None to re-read from env/secrets.
        mode: "local" or "cloud", or None to re-read from env/secrets.
    """
    global _singleton
    with _singleton_lock:
        _singleton = PilotMemory(api_key=api_key, mode=mode)
    return _singleton
