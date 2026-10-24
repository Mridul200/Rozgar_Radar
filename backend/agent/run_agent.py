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
    print("\nStarting Agent event loop (Press Ctrl+C to stop)...\n")
    agent.run()

if __name__ == "__main__":
    main()
