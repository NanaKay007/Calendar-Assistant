# Calendar Assistant

A full-stack web application that lets users manage their Google Calendar through natural language using an AI-powered agent. All mutating actions (create, update, delete events) require explicit user approval before execution.

## Features

- **Natural Language Calendar Management** — Chat with an AI agent to schedule, modify, search, and delete calendar events
- **Human-in-the-Loop Approval** — Review and approve/reject AI-suggested actions before they touch your calendar
- **Google Calendar Integration** — OAuth 2.0 authentication with full access to your Google calendars
- **Conversation History** — Multi-turn conversations persisted across sessions
- **Real-Time Communication** — WebSocket-based chat for instant responses

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Express 5, TypeScript, Node.js |
| AI Agent | LangChain + LangGraph (Google Gemini or Anthropic Claude) |
| Database | MongoDB |
| Auth | Google OAuth 2.0 |
| Real-Time | WebSocket (ws) |
| Testing | Jest, Supertest, mongodb-memory-server |

## Project Structure

```
├── app/                # React frontend
│   └── src/
│       ├── components/ # Auth, Calendar, Chat, Approval, Layout
│       ├── services/   # API and WebSocket clients
│       └── types/
├── backend/            # Express backend
│   └── src/
│       ├── agent/      # LangChain agent and tool definitions
│       ├── controllers/
│       ├── database/   # MongoDB repositories
│       ├── routes/
│       ├── services/   # Business logic
│       └── ws.ts       # WebSocket handler
├── system-design.md    # Architecture and API documentation
├── requirements.md     # Functional requirements
└── dev.sh              # Local development launcher
```

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or [Atlas free tier](https://www.mongodb.com/cloud/atlas))
- [Google Cloud project](https://console.cloud.google.com/) with Calendar API and People API enabled
- OAuth 2.0 credentials (Web application type)

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/NanaKay007/Calendar-Assistant.git
   cd Calendar-Assistant
   ```

2. **Configure the backend environment:**
   ```bash
   cp backend/.env.dev.local.example backend/.env.dev.local
   ```
   Fill in your Google OAuth credentials, MongoDB URI, session secret, token encryption key, and LLM API key. See [backend/README.md](backend/README.md) for details.

3. **Run both frontend and backend:**
   ```bash
   ./dev.sh
   ```
   This starts the backend at `http://localhost:3000` and the frontend at `http://localhost:5173`.

   Or start them individually:
   ```bash
   # Backend
   cd backend && npm install && npm run dev

   # Frontend (separate terminal)
   cd app && npm install && npm run dev
   ```

### Running Tests

```bash
cd backend
npm test
```

Tests use real Google Calendar API calls and a MongoDB memory server. A `GOOGLE_TEST_REFRESH_TOKEN` is required in your environment for calendar integration tests.

## Documentation

- [Backend README](backend/README.md) — API endpoints, environment config, Google Cloud setup
- [Frontend README](app/README.md) — Component architecture, development guide
- [System Design](system-design.md) — Architecture, data models, data flow diagrams, deployment guide
