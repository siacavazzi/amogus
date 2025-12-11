# Copilot Agent Instructions for Sus Party

## Repository Overview

This is a real-life social deduction party game loosely inspired by Among Us. Players use their phones as controllers while completing physical tasks. The project consists of a React frontend (client), a Flask/SocketIO backend (server), and optional Sonos speaker integration.

**Languages & Frameworks:**
- **Client**: React 18 with Tailwind CSS, socket.io-client for real-time communication
- **Server**: Python 3.8+ with Flask, Flask-SocketIO, eventlet
- **Build Tool**: Create React App (react-scripts)

---

## Project Structure

```
amogus/
├── client/                    # React frontend (mobile-friendly PWA)
│   ├── src/
│   │   ├── App.js             # Root component
│   │   ├── GameContext.js     # Central state management via React Context
│   │   ├── PageController.js  # Page routing/rendering logic
│   │   ├── ENDPOINT.js        # Backend URL configuration (auto-detects)
│   │   ├── AudioHandler.js    # Game sound effects using Howler.js
│   │   ├── components/        # Reusable UI components (PlayerCard, Modal, etc.)
│   │   └── pages/             # Game screens (Login, Voting, CrewPage, etc.)
│   ├── package.json
│   └── tailwind.config.js
├── server/
│   ├── app.py                 # Main Flask server with SocketIO handlers
│   ├── config.py              # Game configuration (locations, timing, etc.)
│   ├── assets/
│   │   ├── game.py            # Core Game class
│   │   ├── game_manager.py    # Multi-game instance management
│   │   ├── player.py          # Player data model
│   │   ├── meeting.py         # Voting/meeting logic
│   │   ├── meltdown.py        # Reactor meltdown logic
│   │   ├── card.py            # Intruder ability cards
│   │   ├── taskHandler.py     # Task distribution
│   │   └── sonosHandler.py    # Sonos speaker integration
│   ├── tasks.json             # Default task list
│   ├── requirements.txt       # Python dependencies
│   └── Pipfile                # Alternative Python dependencies
├── deploy/                    # DigitalOcean deployment scripts
└── .github/workflows/deploy.yml  # GitHub Actions CI/CD
```

---

## Build & Development Commands

### Client (React Frontend)

**Always run these commands from the `client/` directory.**

```bash
cd client

# Install dependencies (required before any other command)
npm install

# Start development server (runs on http://localhost:3000)
npm start

# Build for production
CI=false npm run build

# Run tests (non-interactive)
npm test -- --watchAll=false
```

**Important Notes:**
- Always use `CI=false` when building to prevent ESLint warnings from failing the build
- The client has some ESLint warnings (unused variables, missing deps) that are not build-breaking
- Build output goes to `client/build/` (gitignored)

### Server (Python Backend)

**Always run these commands from the `server/` directory.**

```bash
cd server

# Install dependencies (choose one method)
pip install -r requirements.txt
# OR with pipenv:
pipenv install && pipenv shell

# Run development server (runs on http://0.0.0.0:5001)
python app.py

# Test import (quick validation)
python -c "import app"
```

**Important Notes:**
- Server requires Python 3.8+
- The server auto-detects and prints the local IP address for client configuration
- Logs are written to `server/logs/app.log`

---

## Testing

### Dont worry about it

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on push to `main`:

1. **Build**: Installs Node 18, runs `npm ci --legacy-peer-deps`, builds React app with `CI=false`
2. **Deploy**: Uploads to DigitalOcean via rsync
3. **Restart**: Installs Python deps and restarts the systemd service
4. **Health Check**: Hits `/health` endpoint

**Secrets Required:**
- `DROPLET_IP` - Server IP address
- `DROPLET_SSH_KEY` - Private SSH key for deployment

---

## Key Architectural Patterns

### State Management
- Client uses React Context (`GameContext.js`) for all game state
- State is shared across pages via the `DataContext` provider
- Socket events update state, which triggers page transitions in `PageController.js`

### Real-Time Communication
- All game events use Socket.IO
- Server emits to rooms (identified by `room_code`) for multi-game support. Whenever adding a new feature or changing anything, ensure it works within the room system
- Client connects to `ENDPOINT` which auto-detects dev/production

### Page Routing
- No React Router - pages are conditionally rendered in `PageController.js`
- Page state is determined by game state (running, meeting, meltdown, etc.)

---

## Configuration

### Game Settings (`server/config.py`)
- `LOCATIONS` - Physical locations for tasks
- `VOTE_TIME`, `VOTE_THRESHOLD` - Meeting/voting parameters
- `MELTDOWN_TIME`, `CODE_PERCENT` - Reactor meltdown settings
- `NUMBER_OF_INTRUDERS`, `CARD_DRAW_PROBABILITY`, `STARTING_CARDS` - Intruder settings

### Client Endpoint (`client/src/ENDPOINT.js`)
- Auto-detects development vs production
- Development: Uses `hostname:5001`
- Production: Uses same origin

---

## Common Issues & Workarounds

1. **ESLint warnings during build**: Always use `CI=false npm run build`
2. **npm install fails**: Try `npm install --legacy-peer-deps`
3. **Server won't start**: Ensure you're using Python 3.8+, check if port 5001 is free
4. **Tests don't exit cleanly**: This is a known Jest issue with async operations - ignore
5. **Selfies/task_lists not found**: These directories are gitignored - they're created at runtime
6. **Python import errors**: Don't worry about these, usually caused by vscode warnings

---

## Files to Ignore

These are auto-generated or contain user data:
- `client/build/` - Production build output
- `client/node_modules/` - Dependencies
- `server/__pycache__/` - Python bytecode
- `server/selfies/` - User-uploaded images
- `server/task_lists/` - Saved task configurations
- `server/logs/` - Application logs
- `server/*.pem` - SSL certificates

---

## Trust These Instructions

These instructions have been validated by running the build, test, and server startup commands. If you encounter an error not documented here, investigate before assuming the instructions are wrong. Only perform additional exploration if:
- A command fails with an unexpected error
- You need to modify a file not listed in the project structure
- The task requires understanding code not covered here
