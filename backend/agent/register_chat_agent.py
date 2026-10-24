"""
Register External Chat Agent in Agentverse
Connects the cloud-hosted Render deployment to Agentverse via official ACP registration.
"""

import os
import sys

# Ensure root on sys.path
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

from uagents_core.utils.registration import (
    register_chat_agent,
    RegistrationRequestCredentials,
)

DEFAULT_SEED = "rozgar_radar_fetchathon_asi_one_seed_2026_india_first_agent_secure"
DEFAULT_ENDPOINT = "https://rozgar-radar-agent.onrender.com"
DEFAULT_NAME = "ROZAR_RADAR"

def main():
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")

    # Get API key from argument or environment
    api_key = None
    if len(sys.argv) > 1 and not sys.argv[1].startswith("-"):
        api_key = sys.argv[1].strip()
    else:
        api_key = os.getenv("AGENTVERSE_KEY") or os.getenv("AGENTVERSE_API_KEY")

    if not api_key:
        print("❌ Error: AGENTVERSE_KEY is required.")
        print("Usage: python backend/agent/register_chat_agent.py <AGENTVERSE_KEY>")
        print("Or set AGENTVERSE_KEY in your environment / .env file.")
        sys.exit(1)

    seed_phrase = (
        os.getenv("AGENT_SEED_PHRASE")
        or os.getenv("ROZGAR_RADAR_AGENT_SEED")
        or os.getenv("AGENT_SEED")
        or DEFAULT_SEED
    )
    endpoint = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("AGENT_ENDPOINT") or DEFAULT_ENDPOINT
    # Ensure scheme
    if not endpoint.startswith("http"):
        endpoint = f"https://{endpoint}"
    # Strip trailing /submit if register_chat_agent expects base URL or keep standard
    agent_name = os.getenv("AGENT_REGISTRATION_NAME") or DEFAULT_NAME

    print("=" * 60)
    print("📡 Rozgar Radar — External Agentverse Registration")
    print("=" * 60)
    print(f"• Name:      {agent_name}")
    print(f"• Endpoint:  {endpoint}")
    print(f"• Seed:      {seed_phrase[:12]}...{seed_phrase[-8:]}")
    print(f"• Key:       {api_key[:6]}...{api_key[-4:]}")
    print("\nSending registration request to Agentverse...")

    try:
        success = register_chat_agent(
            name=agent_name,
            endpoint=endpoint,
            active=True,
            credentials=RegistrationRequestCredentials(
                agentverse_api_key=api_key,
                agent_seed_phrase=seed_phrase,
            ),
            description=(
                "Rozgar Radar ASI:One Agent — Autonomous Career and Job Matching Copilot. "
                "Searches 2,400+ verified jobs, ranks 6-factor compatibility, "
                "tailors ATS resumes, and drafts applications with direct links."
            ),
            starter_prompts=[
                "Find Python developer jobs in Bengaluru",
                "My core skill is full stack development",
                "Check my eligibility for automation testing with Selenium",
                "Why would Data Engineer match my background in Python and ETL?",
            ]
        )
        if success:
            print("\n✅ SUCCESS: Agent successfully registered in Agentverse!")
            print("Now return to your browser and click: [Evaluate my agent's registration]")
        else:
            print("\n⚠️ NOTICE: Registration returned False. Check the key and endpoint.")
    except Exception as exc:
        print(f"\n❌ REGISTRATION FAILED: {exc}")
        sys.exit(1)

if __name__ == "__main__":
    main()
