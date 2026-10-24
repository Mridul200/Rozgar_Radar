"""
Rozgar Radar ASI:One Agent
Implements the Agent Chat Protocol (ACP) for Fetch.ai / Agentverse / ASI:One discovery.
"""

from __future__ import annotations

import os
import sys
import uuid
import time
import asyncio
import logging
from typing import Optional, Dict, Any

# Ensure project root & backend on sys.path
_agent_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.abspath(os.path.join(_agent_dir, ".."))
_root_dir = os.path.abspath(os.path.join(_backend_dir, ".."))

for p in [_root_dir, _backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from dotenv import load_dotenv
    for env_file in [os.path.join(_root_dir, ".env"), os.path.join(_backend_dir, ".env")]:
        if os.path.exists(env_file):
            load_dotenv(env_file)
except ImportError:
    pass

from uagents import Agent, Context, Protocol, Model
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    chat_protocol_spec,
)

from backend.agent.orchestrator import RozgarAgentOrchestrator

logger = logging.getLogger("rozgar_radar_agent")

# Global singleton orchestrator
orchestrator = RozgarAgentOrchestrator()


class AgentHealthResponse(Model):
    status: str
    agent_name: str
    agent_address: str
    protocol: str
    version: str
    database: str
    job_count: int


def create_agent(
    name: Optional[str] = None,
    seed: Optional[str] = None,
    port: Optional[int] = None,
    mailbox_key: Optional[str] = None
) -> Agent:
    """
    Factory function to initialize the Rozgar Radar ACP Agent.
    Configures network address, cryptographic seed, Agentverse Mailbox, and ACP protocol.
    """
    agent_name = name or os.getenv("AGENT_NAME") or "rozgar_radar_copilot"
    agent_seed = (
        seed
        or os.getenv("ROZGAR_RADAR_AGENT_SEED")
        or os.getenv("AGENT_SEED")
        or "rozgar_radar_fetchathon_asi_one_seed_2026_india_first_agent_secure"
    )
    agent_port = port or int(os.getenv("PORT") or os.getenv("AGENT_PORT") or "8001")

    # Ensure event loop exists for uAgent
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    # Mailbox configuration
    resolved_mailbox_key = mailbox_key or os.getenv("AGENT_MAILBOX_KEY", "").strip()
    use_mailbox = False

    if resolved_mailbox_key or os.getenv("AGENTVERSE_MAILBOX", "").lower() in ("true", "1"):
        use_mailbox = True

    # Endpoints
    raw_endpoint = os.getenv("AGENT_ENDPOINT", "").strip()
    if raw_endpoint:
        if not raw_endpoint.endswith("/submit"):
            raw_endpoint = f"{raw_endpoint.rstrip('/')}/submit"
        endpoints = [raw_endpoint]
    else:
        endpoints = [f"http://127.0.0.1:{agent_port}/submit"]

    agent_kwargs: Dict[str, Any] = {
        "name": agent_name,
        "seed": agent_seed,
        "port": agent_port,
        "loop": loop,
        "enable_agent_inspector": True,
        "publish_agent_details": True,
        "description": (
            "Rozgar Radar ASI:One Agent — Autonomous Career and Job Matching Copilot. "
            "Searches 1,500+ verified jobs, ranks 6-factor compatibility, "
            "tailors ATS resumes, and drafts applications with direct links."
        ),
    }

    if use_mailbox:
        agent_kwargs["mailbox"] = True
        if resolved_mailbox_key and "@" in resolved_mailbox_key:
            agent_kwargs["agentverse"] = resolved_mailbox_key
    else:
        agent_kwargs["endpoint"] = endpoints

    # Instantiate uAgent
    agent = Agent(**agent_kwargs)

    # -----------------------------------------------------------------------
    # Agent Chat Protocol (ACP) Initialization
    # -----------------------------------------------------------------------
    chat_proto = Protocol(spec=chat_protocol_spec)

    @chat_proto.on_message(ChatMessage)
    async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
        """
        Receives an incoming ACP ChatMessage from ASI:One or an external agent,
        acknowledges receipt, invokes the multi-step orchestrator, and sends back the reply.
        """
        # 1. Acknowledge receipt of message immediately per ACP spec
        ack = ChatAcknowledgement(
            timestamp=int(time.time()),
            acknowledged_msg_id=msg.msg_id
        )
        await ctx.send(sender, ack)

        # 2. Extract plain text content from incoming message blocks
        user_text = ""
        for block in msg.content:
            if isinstance(block, TextContent):
                user_text += block.text + " "
            elif hasattr(block, "text"):
                user_text += str(block.text) + " "
        user_text = user_text.strip()

        ctx.logger.info(f"📨 [ACP Received from {sender}]: {user_text}")

        # 3. Execute multi-step reasoning & tool execution via orchestrator with non-blocking threadpool & timeout
        req_id = uuid.uuid4().hex[:8]
        start_t = time.perf_counter()
        ctx.logger.info(f"📨 [{req_id}] [ACP Received from {sender}]: {user_text}")

        try:
            agent_response = await asyncio.wait_for(
                asyncio.to_thread(orchestrator.execute_sync, user_text, {"sender": sender, "request_id": req_id}),
                timeout=25.0
            )
        except asyncio.TimeoutError:
            ctx.logger.warning(f"⚠️ [{req_id}] Agent orchestrator timed out after 25s for input: {user_text[:80]}")
            agent_response = (
                "⏱️ **Rozgar Radar Notice:** Your request took longer than expected to process.\n\n"
                "Here are direct actions you can take right now:\n"
                "• Ask: *\"Find Python developer jobs in Bengaluru\"*\n"
                "• Ask: *\"Show remote software engineer jobs\"*\n"
                "• Ask: *\"Check my eligibility for Python developer\"*\n"
            )
        except Exception as exc:
            ctx.logger.error(f"❌ [{req_id}] Error executing agent orchestrator: {exc}", exc_info=True)
            agent_response = (
                f"⚠️ **Rozgar Radar Agent Notice:** Encountered an error processing your request: {str(exc)}\n"
                f"Please try again or refine your query with specific skills or locations."
            )
        elapsed_ms = (time.perf_counter() - start_t) * 1000
        ctx.logger.info(f"⏱️ [{req_id}] Orchestrator processed in {elapsed_ms:.1f}ms")

        # 4. Construct and deliver ACP ChatMessage response
        response_msg = ChatMessage(
            timestamp=int(time.time()),
            msg_id=uuid.uuid4(),
            content=[TextContent(type="text", text=agent_response)]
        )
        status = await ctx.send(sender, response_msg)
        status_name = getattr(status, "status", "delivered")
        ctx.logger.info(f"📤 [ACP Delivered to {sender}]: status={status_name} len={len(agent_response)} chars")

    @chat_proto.on_message(ChatAcknowledgement)
    async def handle_chat_acknowledgement(ctx: Context, sender: str, msg: ChatAcknowledgement):
        """Logs delivery confirmation received from ASI:One or peer agent."""
        ctx.logger.info(f"✅ [ACP Acknowledged]: msg_id={msg.acknowledged_msg_id} from {sender}")

    # Attach verified protocol to agent
    agent.include(chat_proto)

    # -----------------------------------------------------------------------
    # Lightweight HTTP Health Check Routes for Render Web Service
    # -----------------------------------------------------------------------
    @agent.on_rest_get("/healthz", AgentHealthResponse)
    async def handle_healthz(ctx: Context) -> AgentHealthResponse:
        """Returns 200 OK for Render HTTP health probes and uptime monitoring."""
        try:
            from app.database import ensure_database_initialized, engine
            diag = ensure_database_initialized(engine)
            sanitized_url = diag.get("sanitized_url", "unknown")
            job_count = diag.get("job_count", 0)
            status_val = "healthy"
        except Exception as exc:
            ctx.logger.warning(f"Healthz probe notice: {exc}")
            sanitized_url = "unavailable"
            job_count = 0
            status_val = "degraded"

        return AgentHealthResponse(
            status=status_val,
            agent_name=agent.name,
            agent_address=agent.address,
            protocol=f"Agent Chat Protocol (ACP v{getattr(chat_protocol_spec, 'version', '0.3.0')})",
            version="0.3.1-match10-fast",
            database=sanitized_url,
            job_count=job_count,
        )

    @agent.on_rest_get("/", AgentHealthResponse)
    async def handle_root(ctx: Context) -> AgentHealthResponse:
        """Root endpoint returning agent health status for default Render port scans."""
        try:
            from app.database import ensure_database_initialized, engine
            diag = ensure_database_initialized(engine)
            sanitized_url = diag.get("sanitized_url", "unknown")
            job_count = diag.get("job_count", 0)
            status_val = "healthy"
        except Exception as exc:
            ctx.logger.warning(f"Healthz probe notice: {exc}")
            sanitized_url = "unavailable"
            job_count = 0
            status_val = "degraded"

        return AgentHealthResponse(
            status=status_val,
            agent_name=agent.name,
            agent_address=agent.address,
            protocol=f"Agent Chat Protocol (ACP v{getattr(chat_protocol_spec, 'version', '0.3.0')})",
            version="0.3.1-match10-fast",
            database=sanitized_url,
            job_count=job_count,
        )

    @agent.on_event("startup")
    async def on_startup(ctx: Context):
        from app.database import ensure_database_initialized, engine
        db_diag = ensure_database_initialized(engine, log=ctx.logger)
        try:
            await agent.register()
            ctx.logger.info("📡 Almanac registration attestation verified and published.")
        except Exception as e:
            ctx.logger.warning(f"Almanac registration check notice: {e}")
        ctx.logger.info("=" * 60)
        ctx.logger.info("🚀 Rozgar Radar ASI:One Career Copilot Agent Online!")
        ctx.logger.info(f"• Name:     {agent.name}")
        ctx.logger.info(f"• Address:  {agent.address}")
        ctx.logger.info(f"• Protocol: Agent Chat Protocol (ACP v{getattr(chat_protocol_spec, 'version', '0.3.0')})")
        ctx.logger.info(f"• Database: {db_diag['sanitized_url']} ({db_diag['job_count']:,} active jobs)")
        if use_mailbox:
            ctx.logger.info("• Mode:     Agentverse Mailbox (WebSocket)")
            ctx.logger.info(f"• Inspector: https://agentverse.ai/inspect/?uri=http%3A//127.0.0.1%3A{agent_port}&address={agent.address}")
        else:
            ctx.logger.info(f"• Mode:     Local HTTP Endpoint ({endpoints[0]})")
        ctx.logger.info("=" * 60)

    return agent


# Standalone runner
if __name__ == "__main__":
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")
    agent = create_agent()
    agent.run()
