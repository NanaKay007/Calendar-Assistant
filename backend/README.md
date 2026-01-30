# Calendar Assistant Backend API

Express TypeScript-based backend API for Calendar Assistant with Google OAuth and Google Calendar API integration.

## Features

- **Authentication Service**: GSuite OAuth2 authentication
- **Calendar Service**: Full Google Calendar API integration
- **Database Layer**: MongoDB-backed persistence for users, conversations, messages, and pending actions
- **Session Management**: Secure session-based authentication
- **TypeScript**: Fully typed codebase
- **RESTful API**: Clean and well-documented endpoints

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB (local instance or cloud URI such as MongoDB Atlas)
- Google Cloud Console project with OAuth 2.0 credentials

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

The app loads a different `.env` file depending on `NODE_ENV`:

| `NODE_ENV` | File loaded | Purpose | Git-tracked? |
|---|---|---|---|
| `production` | `.env` | Production deployment | No |
| Any other value (including `development`, `test`) | `.env.dev.local` | Local development and testing | No |

Both files are git-ignored. Example templates are provided:

```bash
# For local development and testing
cp .env.dev.local.example .env.dev.local

# For production
cp .env.example .env
```

Fill in your Google OAuth credentials in `.env.dev.local`. It also includes a `GOOGLE_TEST_REFRESH_TOKEN` field needed for integration tests (see the [Integration Tests](#integration-tests) section).

### 3. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one

#### Enable APIs

Navigate to **APIs & Services → Enabled APIs & services → + ENABLE APIS AND SERVICES** and enable:

- **Google Calendar API**
- **Google People API** (provides user profile and email info)

#### Configure the OAuth Consent Screen

Navigate to **APIs & Services → OAuth consent screen** and configure:

1. **User Type**: External (or Internal if using Google Workspace)
2. **App name**: Calendar Assistant (or any name)
3. **Scopes**: Click "Add or remove scopes" and add the following:

   | Scope | Purpose |
   |---|---|
   | `https://www.googleapis.com/auth/userinfo.profile` | Read user's name and profile picture |
   | `https://www.googleapis.com/auth/userinfo.email` | Read user's email address |
   | `https://www.googleapis.com/auth/calendar` | Read/write access to calendar metadata |
   | `https://www.googleapis.com/auth/calendar.events` | Read/write access to calendar events |

   > The `calendar` and `calendar.events` scopes are **sensitive scopes**. During development Google will show a "This app isn't verified" warning — click **Advanced → Go to [app name] (unsafe)** to proceed.

4. **Test users**: While the app is in "Testing" publishing status, add the Google account(s) you will use for development and testing.

#### Create OAuth 2.0 Credentials

Navigate to **APIs & Services → Credentials → + CREATE CREDENTIALS → OAuth client ID**:

1. **Application type**: Web application
2. **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback`
3. Click **Create**, then copy the **Client ID** and **Client Secret** to your `.env` file

## Running the Application

### Development Mode

```bash
npm run dev
```

This will start the server with hot-reload using `nodemon` and `tsx`.

### Production Build

```bash
npm run build
npm start
```

## API Documentation

### Base URL

```
http://localhost:3000
```

### Health Check

```
GET /health
```

Returns the health status of the API.

### Authentication Endpoints

#### Initiate Login

```
GET /api/auth/login
```

Returns the Google OAuth authorization URL.

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}
```

#### OAuth Callback

```
GET /api/auth/callback?code={authorization_code}
```

Handles the OAuth callback from Google. Redirects to frontend on success.

#### Check Auth Status

```
GET /api/auth/status
```

Check if the user is authenticated.

**Response:**
```json
{
  "success": true,
  "data": {
    "isAuthenticated": true,
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "picture": "https://..."
    }
  }
}
```

#### Get Current User

```
GET /api/auth/me
```

Get the current authenticated user's information.

**Headers:** Requires authentication

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://..."
  }
}
```

#### Logout

```
POST /api/auth/logout
```

Logout the current user and revoke tokens.

**Headers:** Requires authentication

### Calendar Endpoints

All calendar endpoints require authentication.

#### Get All Calendars

```
GET /api/calendars
```

Get list of all calendars the user has access to.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "primary",
      "summary": "John Doe",
      "primary": true,
      "accessRole": "owner",
      "backgroundColor": "#9fe1e7",
      "foregroundColor": "#000000"
    }
  ]
}
```

#### Get Calendar Details

```
GET /api/calendars/:calendarId
```

Get details of a specific calendar.

#### Get Calendar Events

```
GET /api/calendars/:calendarId/events
```

Get events from a specific calendar.

**Query Parameters:**
- `timeMin` (optional): Lower bound for event's start time (ISO 8601)
- `timeMax` (optional): Upper bound for event's start time (ISO 8601)
- `maxResults` (optional): Maximum number of events (default: 100)
- `orderBy` (optional): Sort order ('startTime' or 'updated')

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "summary": "Team Meeting",
      "start": {
        "dateTime": "2026-01-30T10:00:00-05:00",
        "timeZone": "America/New_York"
      },
      "end": {
        "dateTime": "2026-01-30T11:00:00-05:00",
        "timeZone": "America/New_York"
      }
    }
  ]
}
```

#### Get Specific Event

```
GET /api/calendars/:calendarId/events/:eventId
```

Get details of a specific event.

#### Create Event

```
POST /api/calendars/:calendarId/events
```

Create a new event in a calendar.

**Request Body:**
```json
{
  "summary": "Team Meeting",
  "description": "Weekly team sync",
  "startDateTime": "2026-01-30T10:00:00-05:00",
  "endDateTime": "2026-01-30T11:00:00-05:00",
  "timeZone": "America/New_York",
  "location": "Conference Room A",
  "attendees": ["colleague@example.com"]
}
```

#### Update Event

```
PATCH /api/calendars/:calendarId/events/:eventId
```

Update an existing event.

**Request Body:** (all fields optional)
```json
{
  "summary": "Updated Meeting Title",
  "description": "Updated description",
  "startDateTime": "2026-01-30T10:00:00-05:00",
  "endDateTime": "2026-01-30T11:00:00-05:00"
}
```

#### Delete Event

```
DELETE /api/calendars/:calendarId/events/:eventId
```

Delete an event from a calendar.

## Database Layer

The app uses MongoDB for persistent storage, suitable for distributed deployments. Configure the connection via environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB_NAME` | `calendar-assistant` | Database name |

### Collections

| Collection | Purpose |
|---|---|
| `users` | Stores user profiles and OAuth tokens |
| `conversations` | Chat conversation sessions per user |
| `messages` | Individual messages within conversations |
| `pending_actions` | Calendar actions awaiting user approval |

Indexes are created automatically on first connection (e.g., unique index on `users.email`).

### Repository Pattern

Each collection has a corresponding repository class that encapsulates all data access:

- **`UserRepository`** — `upsert`, `findById`, `findByEmail`, `updateTokens`
- **`ConversationRepository`** — `create`, `findById`, `findByUserId`, `updateTimestamp`
- **`MessageRepository`** — `create`, `findByConversationId`
- **`PendingActionRepository`** — `create`, `findById`, `findPendingByConversationId`, `updateStatus`

### Database Tests

The database layer has unit and integration tests using `mongodb-memory-server` (no external MongoDB required):

```bash
# Unit tests
npm test -- --testPathPatterns='database.test'

# Integration tests (cross-repository workflows)
npm test -- --testPathPatterns='database.integration'

# All database tests
npm test -- --testPathPatterns='database'
```

These tests verify index creation, CRUD operations, upsert idempotency, token updates, multi-user isolation, and pending action status transitions.

## Integration Tests

The test suite runs real HTTP requests against the Express app and makes real calls to the Google Calendar API. Nothing is mocked.

### Prerequisites

- A Google Cloud project with OAuth 2.0 credentials (same as the app setup above)
- A Google account with at least one calendar
- A valid OAuth refresh token for that account

### Step 1: Obtain a Refresh Token

The tests need a `GOOGLE_TEST_REFRESH_TOKEN` to authenticate without a browser. To get one:

1. Start the dev server:
   ```bash
   npm run dev
   ```
2. Call the login endpoint to get the OAuth URL:
   ```bash
   curl http://localhost:3000/api/auth/login
   ```
3. Open the returned `authUrl` in your browser and complete the Google sign-in consent flow.
4. After consent, Google redirects to `http://localhost:3000/api/auth/callback?code=...`. The server exchanges this code for tokens and stores them in the session.
5. To extract the refresh token, add a temporary log or breakpoint in `src/controllers/auth.controller.ts` inside `handleCallback` to print `tokens.refresh_token`, or inspect the session store.
6. Copy the refresh token value.

> **Tip:** Make sure you set `prompt: 'consent'` and `access_type: 'offline'` in the OAuth URL (already configured in `auth.service.ts`) so Google issues a refresh token.

### Step 2: Configure the Test Environment

Add the refresh token to your `.env.dev.local` file (the same file used for local development):

```env
GOOGLE_TEST_REFRESH_TOKEN=1//0abc123...your_refresh_token_here
```

### Step 3: Run the Tests

```bash
npm test
```

Tests run sequentially (`--runInBand`) with a 30-second timeout per test to accommodate real API latency.

### What the Tests Cover

#### Auth Integration (`auth.integration.test.ts`)

| Test | What it verifies |
|---|---|
| `GET /api/auth/login` | Returns a real `https://accounts.google.com/o/oauth2/...` URL with correct scopes |
| `GET /api/auth/status` (no session) | Reports `isAuthenticated: false` |
| `GET /api/auth/me` (no session) | Returns 401 |
| `GET /api/auth/status` (authenticated) | Reports `isAuthenticated: true` after session bootstrap |
| `GET /api/auth/me` (authenticated) | Returns user info from the seeded session |
| `POST /api/auth/logout` | Destroys the session and confirms subsequent status checks return unauthenticated |

#### Calendar Integration (`calendar.integration.test.ts`)

| Test | What it verifies |
|---|---|
| `GET /api/calendars` (no session) | Returns 401 |
| `GET /api/calendars` | Returns the real calendar list from Google, with at least one primary calendar |
| `GET /api/calendars/primary` | Returns details for the primary calendar |
| `GET /api/calendars/primary/events` | Returns events array from the primary calendar |
| Events with query params | Respects `timeMin`, `timeMax`, and `maxResults` filters |
| `POST .../events` | Creates a real event titled `[Integration Test] Test Event` on the primary calendar |
| `GET .../events/:eventId` | Fetches the created event by ID and verifies its fields |
| `PATCH .../events/:eventId` | Updates the event summary and description |
| `DELETE .../events/:eventId` | Deletes the event and confirms it's gone |
| Validation | Rejects event creation with missing required fields (400) |

> **Note:** The CRUD lifecycle tests create a temporary event on your real primary calendar. It is automatically deleted at the end of the test run. If a test fails mid-run, you may see a leftover `[Integration Test]` event that can be safely deleted manually.

### How Auth Bootstrapping Works

Since integration tests can't go through the browser-based OAuth consent flow, the test harness uses a different approach:

1. **`setup.ts`** reads `GOOGLE_TEST_REFRESH_TOKEN` from the environment and calls Google's token endpoint to exchange it for a real access token.
2. A test-only `POST /api/test/seed-session` route (available only when `NODE_ENV=test`) accepts the tokens and seeds them into the Express session.
3. Tests use a `supertest.agent()` to persist cookies across requests, so all subsequent calls are authenticated through the real session middleware.

This means the full Express middleware chain — session handling, cookie parsing, auth middleware, and the Google API client — is exercised on every request.

### Troubleshooting

| Problem | Solution |
|---|---|
| `Missing required environment variable: GOOGLE_CLIENT_ID` | Your `.env.dev.local` file is missing or incomplete. Copy `.env.dev.local.example` and fill in all values. |
| `Failed to obtain access token from refresh token` | The refresh token is expired or revoked. Re-run the OAuth flow to get a new one. |
| `FAIL` on calendar list (403) | The Google account hasn't granted calendar permissions. Re-consent with the OAuth flow. |
| Leftover `[Integration Test]` events | Delete them manually from Google Calendar. This happens if the test suite crashes before cleanup. |
| Tests timing out | Real API calls can be slow. The default timeout is 30s per test. You can increase it in `jest.config.ts`. |

## Project Structure

```
backend/
├── src/
│   ├── __tests__/               # Tests
│   │   ├── setup.ts             # Test auth bootstrapping helper
│   │   ├── auth.integration.test.ts
│   │   ├── calendar.integration.test.ts
│   │   ├── database.test.ts     # Database layer unit tests
│   │   └── database.integration.test.ts  # Database integration tests
│   ├── config/
│   │   └── env.ts               # Environment configuration
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   └── calendar.controller.ts
│   ├── middleware/
│   │   └── auth.middleware.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   └── calendar.routes.ts
│   ├── database/
│   │   ├── db.ts                # MongoDB connection and indexes
│   │   ├── index.ts             # Public exports
│   │   └── repositories/       # Data access layer
│   │       ├── userRepository.ts
│   │       ├── conversationRepository.ts
│   │       ├── messageRepository.ts
│   │       └── pendingActionRepository.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   └── calendar.service.ts
│   ├── types/
│   │   └── index.ts
│   ├── app.ts                   # Express app (no server start)
│   └── index.ts                 # Server entry point
├── .env.example
├── .gitignore
├── jest.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Technologies Used

- **Express.js**: Web framework
- **TypeScript**: Type-safe JavaScript
- **Google APIs**: OAuth2 and Calendar API
- **MongoDB**: Document database for distributed-friendly persistence
- **express-session**: Session management
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management
- **Jest + Supertest**: Integration testing

## License

ISC
