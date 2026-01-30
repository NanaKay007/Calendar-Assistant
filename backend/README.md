# Calendar Assistant Backend API

Express TypeScript-based backend API for Calendar Assistant with Google OAuth and Google Calendar API integration.

## Features

- **Authentication Service**: GSuite OAuth2 authentication
- **Calendar Service**: Full Google Calendar API integration
- **Session Management**: Secure session-based authentication
- **TypeScript**: Fully typed codebase
- **RESTful API**: Clean and well-documented endpoints

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Google Cloud Console project with OAuth 2.0 credentials

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Session Configuration
SESSION_SECRET=your_session_secret_here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### 3. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google Calendar API
   - Google+ API (for user info)
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback`
5. Copy the Client ID and Client Secret to your `.env` file

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

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   └── env.ts       # Environment configuration
│   ├── controllers/     # Request handlers
│   │   ├── auth.controller.ts
│   │   └── calendar.controller.ts
│   ├── middleware/      # Express middleware
│   │   └── auth.middleware.ts
│   ├── routes/          # API routes
│   │   ├── auth.routes.ts
│   │   └── calendar.routes.ts
│   ├── services/        # Business logic
│   │   ├── auth.service.ts
│   │   └── calendar.service.ts
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   └── index.ts         # Application entry point
├── .env.example         # Example environment variables
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Technologies Used

- **Express.js**: Web framework
- **TypeScript**: Type-safe JavaScript
- **Google APIs**: OAuth2 and Calendar API
- **express-session**: Session management
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management

## License

ISC
