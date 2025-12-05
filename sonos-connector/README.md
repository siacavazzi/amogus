# Among Us - Sonos Connector

A lightweight client that connects your local Sonos speakers to the hosted Among Us game.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

Or install directly:
```bash
pip install python-socketio[client] soco requests
```

### 2. Run the Connector

```bash
python sonos_connector.py ROOM_CODE
```

Replace `ROOM_CODE` with the 4-letter code from your game.

### Options

```bash
python sonos_connector.py ABCD --volume 50        # Set volume to 50%
python sonos_connector.py ABCD --include-bedroom  # Include bedroom speakers
python sonos_connector.py ABCD --server https://your-server.com  # Custom server
```

## How It Works

1. The connector discovers Sonos speakers on your local network
2. It connects to the game server via WebSocket
3. When the game plays sounds, it receives events and plays them on your Sonos

## Requirements

- Python 3.7+
- Sonos speakers on the same network
- Game room code

## Troubleshooting

### No speakers found
- Make sure your computer is on the same network as your Sonos speakers
- Check that Sonos speakers are powered on

### Connection failed
- Verify the room code is correct
- Check your internet connection
- Make sure the game server is running

### Sound not playing
- Check speaker volume
- Verify speakers are grouped correctly

## Building an Executable

To create a standalone executable:

```bash
pip install pyinstaller
pyinstaller --onefile sonos_connector.py
```

The executable will be in the `dist/` folder.
