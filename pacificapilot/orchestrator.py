"""
Orchestrator for running Loop Agent + Chat Agent + Telegram bot concurrently.

Uses asyncio to supervise all three agents independently — if one crashes, the others keep running.
"""

import asyncio
import signal
import sys
from typing import Optional

from .agents import LoopAgent, ChatAgent
from .telegram import TelegramBot
from .storage import load_config


class Orchestrator:
    """Orchestrates Loop Agent, Chat Agent, and Telegram bot."""

    def __init__(self):
        self.config = load_config()
        self.loop_agent: Optional[LoopAgent] = None
        self.chat_agent: Optional[ChatAgent] = None
        self.telegram_bot: Optional[TelegramBot] = None
        self.running = False

    async def start(self):
        """Start all agents concurrently."""
        self.running = True

        print("\n" + "=" * 60)
        print("PacificaPilot — Starting All Agents")
        print("=" * 60)
        print(f"Mode: {self.config['mode']} | Dry run: {self.config['dry_run']}")
        print(f"Symbols: {', '.join(self.config['symbols'])}")
        print(f"Remote mode: {self.config.get('remote_mode_enabled', False)}")
        print("=" * 60 + "\n")

        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)

        # Launch agents as tasks
        tasks = []

        # Loop Agent (runs in thread pool since it's synchronous)
        loop_task = asyncio.create_task(self._run_loop_agent())
        tasks.append(loop_task)
        print("[Orchestrator] Loop Agent task created")

        # Chat Agent (runs in thread pool since it's synchronous REPL)
        chat_task = asyncio.create_task(self._run_chat_agent())
        tasks.append(chat_task)
        print("[Orchestrator] Chat Agent task created")

        # Telegram bot (async, only if remote mode enabled)
        if self.config.get("remote_mode_enabled", False):
            telegram_task = asyncio.create_task(self._run_telegram_bot())
            tasks.append(telegram_task)
            print("[Orchestrator] Telegram bot task created")

        print("\n[Orchestrator] All agents started. Press Ctrl+C to stop.\n")

        # Wait for all tasks (will run indefinitely until interrupted)
        try:
            await asyncio.gather(*tasks)
        except asyncio.CancelledError:
            print("\n[Orchestrator] Shutdown initiated...")
        finally:
            print("[Orchestrator] All agents stopped.")

    async def _run_loop_agent(self):
        """Run Loop Agent in thread pool."""
        loop = asyncio.get_event_loop()

        def run_loop():
            self.loop_agent = LoopAgent()
            try:
                self.loop_agent.start()
            except Exception as e:
                print(f"[Loop Agent] Error: {e}")
                import traceback
                traceback.print_exc()

        await loop.run_in_executor(None, run_loop)

    async def _run_chat_agent(self):
        """Run Chat Agent REPL in thread pool."""
        loop = asyncio.get_event_loop()

        def run_chat():
            self.chat_agent = ChatAgent()
            try:
                self.chat_agent.start()
            except Exception as e:
                print(f"[Chat Agent] Error: {e}")
                import traceback
                traceback.print_exc()

        await loop.run_in_executor(None, run_chat)

    async def _run_telegram_bot(self):
        """Run Telegram bot (async)."""
        self.telegram_bot = TelegramBot()
        try:
            await self.telegram_bot.start()
        except Exception as e:
            print(f"[Telegram] Error: {e}")
            import traceback
            traceback.print_exc()

    def _handle_signal(self, signum, frame):
        """Handle shutdown signals."""
        print(f"\n[Orchestrator] Received signal {signum}, shutting down...")
        self.running = False

        if self.loop_agent:
            self.loop_agent.stop()

        sys.exit(0)


async def main():
    """Entry point for pacifica start."""
    orchestrator = Orchestrator()
    await orchestrator.start()


if __name__ == "__main__":
    asyncio.run(main())
