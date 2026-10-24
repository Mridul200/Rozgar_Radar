# Rozgar Radar — ASI:One & Agentverse Integration

> **Fetch-A-Thon 3.0 Challenge**: *"ASI:One Agent Challenge – From Intent to Action"*  
> **Agent Name**: `rozgar_radar_agent`  
> **Agent Address**: `agent1qgq8slegxr8rvl7hdxlsrhkfaraumhx43sw5v0yau9ufs9e2f0gfqx9hwm3`  
> **Protocol**: Agent Chat Protocol (`AgentChatProtocol:0.3.0` / ACP) via Fetch.ai `uagents`

---

## 1. Overview & Architecture

Rozgar Radar's ASI:One Agent transforms unstructured user intent into autonomous multi-step career actions. Instead of a superficial text chatbot, the agent natively orchestrates Rozgar Radar's production database (1,500+ verified jobs), 6-factor matching engine, ATS resume optimization suite, and application link verification pipeline.

```
+-------------------------------------------------------------+
|                     ASI:One Chat Interface                  |
|                           (asi1.ai)                         |
+------------------------------+------------------------------+
                               |  Agent Chat Protocol (ACP v0.3.0)
                               v
+-------------------------------------------------------------+
|               Agentverse Mailbox / Hosted Agent             |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|              uAgent (`acp_agent.py` / `create_agent`)       |
|    - ChatMessage & ChatAcknowledgement protocol handlers     |
|    - Deterministic address derivation from seed phrase      |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|          Orchestrator Engine (`orchestrator.py`)            |
|    - Natural language intent & entity parsing               |
|    - Multi-step workflow planning & tool chaining           |
+------------------------------+------------------------------+
                               |
        +----------------------+----------------------+
        |                      |                      |
        v                      v                      v
+---------------+      +---------------+      +---------------+
| search_jobs   |      | match_and_    |      | check_        |
| - 1,500+ jobs |      | rank_jobs     |      | candidate_    |
| - Verified    |      | - 6-factor    |      | eligibility   |
|   ATS links   |      |   scoring     |      | - Gap analysis|
+---------------+      +---------------+      +---------------+
        |                      |                      |
        +----------------------+----------------------+
        |                      |
        v                      v
+---------------+      +---------------+
| tailor_resume |      | prepare_appli-|
| - Keyword ATS |      | cation_draft  |
| - Tailored bio|      | - Custom letter
| - Before/After|      | - Direct link |
+---------------+      +---------------+
```

---

## 2. Implemented Tools (Intent-to-Action)

1. **`search_jobs`**  
   Searches live job listings from Rozgar Radar's SQLite database (`database/jobs.db`) with filters for keywords, location, remote preference, and company. Returns verified direct external ATS application URLs (Greenhouse, Lever, Ashby, Workday, etc.).

2. **`match_and_rank_jobs`**  
   Executes Rozgar Radar's rigorous 6-factor deterministic matching algorithm:
   - Skills Overlap & Recency (35% weight)
   - Job Role / Title Alignment (25% weight)
   - Years of Experience Fit (15% weight)
   - Location & Remote Compatibility (10% weight)
   - Salary Expectations Compatibility (10% weight)
   - Education Qualification (5% weight)

3. **`check_candidate_eligibility`**  
   Performs a structured gap analysis against any target job. Identifies missing critical skills, experience shortages, location relocation requirements, and outputs concrete steps to qualify.

4. **`tailor_resume`**  
   Rewrites and optimizes the candidate's resume for a specific job:
   - Injects missing ATS keywords naturally.
   - Generates an executive summary tailored to the target role.
   - Formulates targeted achievement bullet points following Google's "Accomplished [X] by doing [Y] resulting in [Z]" formula.
   - Calculates before-and-after ATS optimization scores.

5. **`prepare_application_draft`**  
   Produces a ready-to-submit personalized application package, including:
   - Targeted cover letter draft with candidate's actual qualifications.
   - Application checklist.
   - Verified direct link to the external ATS job listing.

---

## 3. Directory Structure

```
backend/
├── agent/
│   ├── __init__.py           # Package exports (tools, orchestrator, create_agent)
│   ├── acp_agent.py          # uAgent with Agent Chat Protocol (ACP) handlers
│   ├── orchestrator.py       # Intent classification, entity extraction & execution
│   ├── run_agent.py          # Standalone executable runner for local or mailbox operation
│   ├── tools.py              # 5 discrete Rozgar Radar production tools
│   └── README.md             # This documentation
├── app/
│   └── api/
│       ├── agent_api.py      # FastAPI REST wrapper (/api/v1/agent/*)
│       └── __init__.py       # Mounted agent router
└── requirements.txt          # Added uagents>=0.26.0
tests/
└── test_acp_agent.py         # 13 comprehensive test cases for ACP & tools
```

---

## 4. How to Run Locally

### Prerequisites
Make sure Python 3.10 or 3.11 is used (Python 3.14 has known Pydantic v1 PEP 604 issues with current uagents).

```bash
# In the project root directory
.\.venv\Scripts\python backend/agent/run_agent.py
```

Expected output:
```
[INFO]: Starting Rozgar Radar uAgent (Agent Chat Protocol)...
[INFO]: Agent Name: rozgar_radar_agent
[INFO]: Agent Address: agent1qgq8slegxr8rvl7hdxlsrhkfaraumhx43sw5v0yau9ufs9e2f0gfqx9hwm3
[INFO]: Registered Protocols: ['AgentChatProtocol:0.3.0']
[INFO]: Running in standalone mode. To connect to Agentverse mailbox, set AGENT_MAILBOX_KEY in .env
```

### Running the FastAPI Endpoints
```bash
.\.venv\Scripts\uvicorn backend.app.main:app --reload --port 8000
```
- **Agent Info**: `GET http://localhost:8000/api/v1/agent/info`
- **Agent Chat**: `POST http://localhost:8000/api/v1/agent/chat`
- **Swagger Docs**: `http://localhost:8000/docs#/Agent`

---

## 5. Agentverse Registration & Deployment

### Option A: Agentverse Mailbox (Recommended for Local Code Execution)
Connecting your local running agent to Agentverse allows ASI:One to reach your machine directly via a secure outbound WebSocket mailbox without opening ports.

1. Go to [https://agentverse.ai](https://agentverse.ai) and sign in.
2. Navigate to **Agents** > **Local Agents** or click **Mailroom / Mailbox**.
3. Create a new mailbox for your agent address:
   `agent1qgq8slegxr8rvl7hdxlsrhkfaraumhx43sw5v0yau9ufs9e2f0gfqx9hwm3`
4. Copy the generated **Mailbox Key**.
5. Add it to your `.env` file:
   ```env
   AGENT_MAILBOX_KEY=your_copied_mailbox_key_here
   AGENTVERSE_MAILBOX=true
   ```
6. Re-run:
   ```bash
   .\.venv\Scripts\python backend/agent/run_agent.py
   ```
   The agent will now register with the Agentverse Almanac and listen for messages via the Mailbox.

### Option B: Hosted Agent on Agentverse
1. In [https://agentverse.ai](https://agentverse.ai), navigate to **My Agents** > **+ New Agent** > **Blank Agent**.
2. Name it `Rozgar Radar - AI Job Assistant`.
3. In the code editor, you can deploy the standalone ACP protocol agent that forwards queries to your deployed Rozgar Radar backend (`https://rozgar-radar-lemon.vercel.app` or Render backend).
4. Click **Start** to run the agent in the Agentverse cloud.

---

## 6. Discovering & Chatting via ASI:One (`asi1.ai`)

1. Open [https://asi1.ai](https://asi1.ai) and log in.
2. In the Search / Explore bar, search for:
   - `Rozgar Radar`
   - Or paste the exact agent address:
     `agent1qgq8slegxr8rvl7hdxlsrhkfaraumhx43sw5v0yau9ufs9e2f0gfqx9hwm3`
3. Click on the agent profile to open a chat session.
4. Try natural language prompts:
   - *"Find me remote React or Python developer jobs in India and match them with my skills: React, TypeScript, FastAPI, PostgreSQL, 3 years experience."*
   - *"Check my eligibility for the senior backend developer position."*
   - *"Tailor my resume for the Python engineer opening and give me my ATS score improvement."*
   - *"Draft an application with a cover letter for the frontend developer job."*
5. In ASI:One chat, click the **Share** button in the top right corner to generate the **Public Shared Chat URL**.
6. Submit this URL along with your project repository for the Fetch-A-Thon 3.0 challenge.

---

## 7. Running Tests

Run the dedicated test suite:
```bash
.\.venv\Scripts\python.exe -m pytest tests/test_acp_agent.py -v
```

Run the entire project test suite:
```bash
.\.venv\Scripts\python.exe -m pytest
```
All 92 tests pass with zero errors.
