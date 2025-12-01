# Among Us IRL 🚀

A real-life implementation of the popular game Among Us! Play with friends in person using your phones as controllers while completing tasks around your physical location.

## Features

- 🎮 Real-time multiplayer gameplay via WebSockets
- 📱 Mobile-friendly web interface
- 🗳️ Voting system during meetings
- ⚠️ Meltdown events with code entry mechanics
- 🔊 Optional Sonos speaker integration for sound effects
- 🃏 Card system for imposters

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **Python 3.8+** - [Download](https://www.python.org/downloads/)
- **pipenv** - Install via `pip install pipenv`

## Project Structure

```
amogus/
├── client/          # React frontend application
│   ├── src/
│   │   ├── pages/   # Game screens (Login, Voting, Tasks, etc.)
│   │   └── ...
│   └── package.json
├── server/          # Flask backend server
│   ├── app.py       # Main server file with game configuration
│   ├── assets/      # Game logic (cards, meetings, players, etc.)
│   └── Pipfile
└── README.md
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd amogus
```

### 2. Backend Setup (Flask Server)

```bash
# Navigate to the server directory
cd server

# Install Python dependencies using pipenv
pipenv install

# Activate the virtual environment
pipenv shell

# Start the backend server
python app.py
```

The server will start on `http://0.0.0.0:5001`. Note the IP address printed in the console - you'll need this for the frontend configuration.

### 3. Frontend Setup (React Client)

Open a new terminal window:

```bash
# Navigate to the client directory
cd client

# Install Node.js dependencies
npm install

# Start the development server
npm start
```

The React app will start on `http://localhost:3000`.

### 4. Configure the Connection

**Important:** You need to update the backend endpoint in the frontend to match your server's IP address.

1. Open `client/src/ENDPOINT.js`
2. Update the `ENDPOINT` variable with your server's IP address:

```javascript
export const ENDPOINT = '<YOUR_SERVER_IP>:5001'
```

For example, if your server is running on `192.168.1.100`:
```javascript
export const ENDPOINT = '192.168.1.100:5001'
```

> **Tip:** The server prints the correct IP address when it starts. Look for the message: `Please set ENDPOINT to: http://<IP>:5001`

## Game Configuration

All game settings are stored in `server/config.py`. Edit this file to customize gameplay for your venue and group size.

### Location Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `LOCATIONS` | `['Basement', '1st Floor', '2nd Floor', '3rd Floor']` | Physical locations in your venue where tasks will be assigned. Customize these to match real places players can go. "Other" is automatically added. |

### Meeting & Voting Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `VOTE_TIME` | `180` | Duration of the voting phase during meetings (in seconds) |
| `VOTE_THRESHOLD` | `0.66` | Fraction of votes needed to eject a player. `0.66` = 2/3 majority required |

### Meltdown Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `MELTDOWN_TIME` | `60` | Time (in seconds) players have to stop a meltdown before it ends the game |
| `CODE_PERCENT` | `0.6` | Fraction of players who must enter their code to stop a meltdown. `0.6` = 60% of players |

### Imposter Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `NUMBER_OF_IMPOSTERS` | `2` | Number of imposters assigned each game. Adjust based on group size |
| `CARD_DRAW_PROBABILITY` | `0.90` | Chance (0.0-1.0) an imposter draws a card. Lower this if imposters are too powerful |
| `STARTING_CARDS` | `2` | Number of ability cards imposters start with |

### Task Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `TASK_RATIO` | `12` | Average number of tasks each crewmate needs to complete for crew to win |

### Sound Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `SONOS_ENABLED` | `False` | Enable Sonos speaker integration for game sound effects |
| `SPEAKER_VOLUME` | `50` | Speaker volume percentage (0-100) |
| `IGNORE_BEDROOM_SPEAKERS` | `True` | Skip speakers with "bed" in the name (to avoid disturbing people) |

### Example Configuration

To customize for a larger group in an office building:

```python
# config.py
LOCATIONS = [
    'Lobby',
    'Conference Room A',
    'Conference Room B',
    'Kitchen',
    'Server Room',
    'Rooftop',
]

VOTE_TIME = 120           # Shorter voting time
NUMBER_OF_IMPOSTERS = 3   # More imposters for larger group
TASK_RATIO = 15           # More tasks to complete
MELTDOWN_TIME = 45        # Less time for meltdowns
```

### Adding Custom Tasks

Tasks can be added via the `server/tasks.json` file or through the socket interface. Each task should include a location that matches one of the defined `locations` in `app.py`.

## Running the Game

1. **Start the backend server** (must be running first)
2. **Start the frontend** 
3. **Connect players** - Have all players open the frontend URL on their phones
4. **Enter usernames** - Each player enters their name
5. **Start the game** - Once all players have joined, start the game
6. **Play!** - Complete tasks, call meetings, and find the imposters!

## Playing on Local Network

For the best experience playing with friends:

1. Run the server on a computer connected to the same WiFi network as all players
2. Update `ENDPOINT.js` with the server computer's local IP address
3. Have players access the game via `http://<SERVER_IP>:3000` on their phones

## Sound Effects (Optional)

If you have Sonos speakers, you can enable sound effects:

1. Set `sonos_enabled = True` in `server/app.py`
2. Ensure your server is on the same network as your Sonos speakers
3. Adjust `speaker_volume` as needed
4. Set `ignore_bedroom_speakers = True` to skip bedroom speakers

## Troubleshooting

### Connection Issues
- Ensure both client and server are on the same network
- Verify the `ENDPOINT` in `client/src/ENDPOINT.js` matches your server IP
- Check that port 5001 (backend) and 3000 (frontend) are not blocked by firewall

### Server Won't Start
- Make sure you're in the pipenv shell: `pipenv shell`
- Verify Python 3.8+ is installed: `python --version`
- Check if port 5001 is already in use

### Frontend Won't Start
- Delete `node_modules` and run `npm install` again
- Ensure Node.js v14+ is installed: `node --version`

## Development

### Backend Logs
Server logs are written to `server/logs/app.log` for debugging.

### Building for Production

```bash
cd client
npm run build
```

This creates an optimized build in `client/build/` that can be served by any static file server.

## License

This project is for educational and entertainment purposes only. Among Us is a trademark of Innersloth LLC.
