# Amogus: IRL Social Deduction Game

This project is a local multiplayer twist on **Among Us** designed for in-person games. A Python Flask server keeps track of each player's status while a React front‑end lets everyone join, vote, and handle sabotages from their phones.

## Features

- Real‑time communication over websockets for meetings and tasks
- Optional Sonos speaker integration for in‑game sound effects
- Customizable game settings such as meltdown timers, voting duration and number of impostors
- React client with simple controls for joining rooms and performing actions

## Prerequisites

- **Node.js** and **npm** for the client
- **Python 3.8** and **pipenv** for the server

## Setup

Clone the repository and install dependencies for both the server and the client:

```bash
# Frontend
cd client
npm install

# Backend
cd ../server
pipenv install
```

## Running the Game

1. **Start the server**
   ```bash
   cd server
   pipenv run python app.py
   ```
2. **Start the client** (in a separate terminal)
   ```bash
   cd client
   npm start
   ```
   The React app runs on [http://localhost:3000](http://localhost:3000).

Open the site in a browser on each device and create or join a room to play. When everyone has joined, start the game from one device and follow the on‑screen prompts.

Enjoy!
