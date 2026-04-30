# Sus Party

A real-life social deduction party game inspired by Among Us. Play in your actual house. Phones are the controllers.

**Play it now → [susparty.com](https://susparty.com)**

No accounts. No install. No ads. No catches.

---

## What it is

You and your friends gather in a house, apartment, dorm, office, wherever. One device (a laptop, TV, or tablet) runs the shared "Reactor" screen. Everyone else joins on their phone with a 6-character room code.

- **Crewmates** run around completing real physical tasks ("open the fridge", "find the card in the bookshelf", etc.)
- **Intruders** sneak around, kill players one-on-one, sabotage tasks, and lie in meetings
- When a body gets reported, anyone can call a meeting → discussion → vote → eject
- Crew win by finishing all tasks or voting out every intruder. Intruders win by reaching parity.

Best with **5–12 players**. Setup takes about 5 minutes — pick locations in your house and use the example task list (or write your own).

---

## The Sonos thing

If you have a Sonos speaker, Sus Party can pipe game audio through it instead of a tinny laptop speaker. The reactor alarm screams from across the house. Meeting bells echo through every room. Discovery sounds play from the speaker nearest the body.

It's optional, but it's the part everyone remembers. It turns the game from "phone game with extra steps" into something genuinely cinematic.

- Drop in your Sonos household, pick which rooms participate, and play
- Bedroom speakers can be auto-skipped so you don't wake anyone up
- Setup happens on the Reactor screen — no config files

The Sonos integration lives in a separate connector you run on the same Wi-Fi:
**[github.com/siacavazzi/amogus-sonos-connector](https://github.com/siacavazzi/amogus-sonos-connector)**

---

## How to play

1. On a laptop, TV, or tablet, open **[susparty.com](https://susparty.com)** — that device becomes the Reactor screen
2. Create a game and share the room code
3. Everyone else opens **susparty.com** on their phone and joins with the code
4. The host configures locations, tasks, and (optionally) Sonos
5. Hit start. Spread out. Try not to die.

Full rules, role descriptions, and tips: **[susparty.com/how-to-play](https://susparty.com/how-to-play)**

---

## Why it exists

Built it because party games on a couch are great but party games where you actually *move* are better. Wanted the social deduction of Among Us / Mafia / Werewolf without losing the physical chaos of Sardines or Hide-and-Seek. This is the result.

It's free because it should be. There's no business model. Run it once at a party and that's enough.

---

## Tech, briefly

- **Frontend:** React 18 + Tailwind, mobile-first PWA
- **Backend:** Flask + Flask-SocketIO (eventlet), room-scoped real-time state
- **Sonos:** separate Node connector that talks to your speakers over LAN
- **Hosting:** single DigitalOcean droplet behind nginx

Source: this repo. Sonos connector: [amogus-sonos-connector](https://github.com/siacavazzi/amogus-sonos-connector).

---

## Self-hosting

You almost certainly don't need to. **[susparty.com](https://susparty.com)** is the same code, runs free, and supports unlimited concurrent games via room codes. Just use it.

If you want to run your own copy anyway (private LAN-only, custom rules, hacking on the code), see [`SELF_HOSTING.md`](SELF_HOSTING.md).

---

## Contributing / feedback

Bug reports, feature ideas, and "I played this with 14 people and here's what broke" stories are all welcome. Open an issue or PR.

---

## License

For non-commercial use. Loosely inspired by social deduction games like Among Us. Not affiliated with Innersloth.
