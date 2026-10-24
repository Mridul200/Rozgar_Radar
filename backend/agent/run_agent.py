"""
Run Rozgar Radar ASI:One Agent
Command-line runner for the Fetch.ai uAgent with Agent Chat Protocol (ACP).
"""

import os
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure project root & backend are available on sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.abspath(os.path.join(_current_dir, ".."))
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

from backend.agent.acp_agent import create_agent

def main():
    print("=" * 65)
    print("🇮🇳 Rozgar Radar — ASI:One & Agentverse AI Agent")
    print("Fetch-A-Thon 3.0: 'From Intent to Action'")
    print("=" * 65)
    
    from app.database import ensure_database_initialized, engine
    db_diag = ensure_database_initialized(engine)
    print("\n[Database Connection Diagnostic]")
    print(f"• Engine:    {db_diag['dialect'].upper()}")
    print(f"• Location:  {db_diag['sanitized_url']}")
    print(f"• Status:    Table 'job_listings' verified ({db_diag['job_count']:,} jobs available)")

    agent = create_agent()
    print(f"\n[Agent Initialized]")
    print(f"• Name:    {agent.name}")
    print(f"• Address: {agent.address}")
    print(f"• Network: Fetch.ai Almanac / Agentverse")

    # -------------------------------------------------------------------
    # Official Agentverse External Registration
    # -------------------------------------------------------------------
    agentverse_key = os.getenv("AGENTVERSE_KEY")
    agent_seed_phrase = (
        os.getenv("AGENT_SEED_PHRASE")
        or os.getenv("ROZGAR_RADAR_AGENT_SEED")
        or "rozgar_radar_fetchathon_asi_one_seed_2026_india_first_agent_secure"
    )

    if agentverse_key:
        try:
            from uagents_core.utils.registration import (
                register_chat_agent,
                RegistrationRequestCredentials,
            )
            print("\n[Agentverse External Registration] Registering agent with Agentverse...")
            reg_ok = register_chat_agent(
                "ROZAR_RADAR",
                "https://rozgar-radar-agent.onrender.com",
                active=True,
                credentials=RegistrationRequestCredentials(
                    agentverse_api_key=agentverse_key,
                    agent_seed_phrase=agent_seed_phrase,
                ),
            )
            if reg_ok:
                print("✅ Successfully registered ROZAR_RADAR with Agentverse!")
            else:
                print("⚠️ Agentverse registration returned false.")
        except Exception as e:
            print(f"⚠️ Agentverse registration notice: {e}")

    print("\nStarting Agent event loop (Press Ctrl+C to stop)...\n")
    agent.run()

if __name__ == "__main__":
    main()
