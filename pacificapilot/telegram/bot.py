"""
Telegram bot — remote mode front door into the Chat Agent.

Routes all messages to ChatAgent.handle_message(), same logic as REPL.
One-time pairing flow binds a Telegram chat ID to the local instance.
"""

import asyncio
from typing import Optional
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

from ..agents import ChatAgent
from ..storage import load_config, update_config, load_secrets


class TelegramBot:
    """Telegram bot for remote mode."""

    def __init__(self):
        self.chat_agent = ChatAgent()
        self.config = load_config()
        self.secrets = load_secrets()
        self.allowed_chat_ids = set(self.config.get("telegram_chat_ids", []))
        self.pending_pairing_code: Optional[str] = None

    async def start(self):
        """Start the Telegram bot."""
        token = self.secrets.get("TELEGRAM_BOT_TOKEN")
        if not token:
            print("[Telegram] ERROR: TELEGRAM_BOT_TOKEN not found in secrets")
            return

        print("[Telegram] Starting bot...")

        # Build application
        app = Application.builder().token(token).build()

        # Register handlers
        app.add_handler(CommandHandler("start", self.cmd_start))
        app.add_handler(CommandHandler("pair", self.cmd_pair))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))

        # Initialize and start (don't use run_polling in an existing event loop)
        await app.initialize()
        await app.start()

        # Start polling in the background
        await app.updater.start_polling(allowed_updates=Update.ALL_TYPES)

        # Keep running until stopped
        try:
            while True:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            await app.updater.stop()
            await app.stop()
            await app.shutdown()

    async def cmd_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command."""
        await update.message.reply_text(
            "Welcome to PacificaPilot!\n\n"
            "To pair this bot with your local instance:\n"
            "1. Run `/remote` in your local terminal\n"
            "2. Copy the pairing code\n"
            "3. Send `/pair <code>` here\n\n"
            "After pairing, you can use all /commands and ask questions."
        )

    async def cmd_pair(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /pair command for one-time chat ID binding."""
        chat_id = update.effective_chat.id

        # Check if already paired
        if chat_id in self.allowed_chat_ids:
            await update.message.reply_text("Already paired!")
            return

        # Check pairing code
        if not context.args or len(context.args) != 1:
            await update.message.reply_text("Usage: /pair <code>")
            return

        code = context.args[0]

        # Verify code (in real implementation, generate and verify from local terminal)
        # For now, accept any 6-digit code and add chat ID
        if len(code) == 6 and code.isdigit():
            self.allowed_chat_ids.add(chat_id)

            # Update config
            chat_ids = list(self.allowed_chat_ids)
            update_config({"telegram_chat_ids": chat_ids})

            await update.message.reply_text(
                f"✅ Paired successfully!\n\n"
                f"Your chat ID: {chat_id}\n"
                f"You can now use all /commands and ask questions."
            )
            print(f"[Telegram] Paired with chat ID: {chat_id}")
        else:
            await update.message.reply_text("Invalid pairing code. Must be 6 digits.")

    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle all text messages."""
        chat_id = update.effective_chat.id

        # Check if paired
        if chat_id not in self.allowed_chat_ids:
            await update.message.reply_text(
                "Not paired. Send /start to begin pairing process."
            )
            return

        message_text = update.message.text

        # Route to Chat Agent
        try:
            response = self.chat_agent.handle_message(message_text)
            await update.message.reply_text(response)
        except Exception as e:
            await update.message.reply_text(f"Error: {str(e)}")
            print(f"[Telegram] Error handling message: {e}")

    async def send_notification(self, message: str):
        """Send a push notification to all paired chat IDs."""
        if not self.allowed_chat_ids:
            return

        token = self.secrets.get("TELEGRAM_BOT_TOKEN")
        if not token:
            return

        app = Application.builder().token(token).build()

        for chat_id in self.allowed_chat_ids:
            try:
                await app.bot.send_message(chat_id=chat_id, text=message)
            except Exception as e:
                print(f"[Telegram] Failed to send notification to {chat_id}: {e}")


def generate_pairing_code() -> str:
    """Generate a 6-digit pairing code."""
    import random
    return str(random.randint(100000, 999999))
