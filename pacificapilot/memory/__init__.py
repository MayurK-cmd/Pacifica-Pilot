"""
PacificaPilot memory layer.

Optional Supermemory-backed persistent memory. Memory failure must never
block trading — every call is best-effort and silently returns empty/None
on error. See client.py for the implementation.
"""

from .client import PilotMemory, get_memory, reset_memory

__all__ = ["PilotMemory", "get_memory", "reset_memory"]
