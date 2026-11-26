# best-flight-game

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=badge&utm_campaign=makefun)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/a5044673838-gif/best-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=badge&utm_campaign=makefun)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/a5044673838-gif/best-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=badge&utm_campaign=makefun)

**Ridge Runner** — a chase-view flight game built for make.fun's "Make the best flight game" bounty ($500 in USDC).

Fly a jet through glowing rings over a mountain valley. Altitude, speed and heading live on the HUD, with an attitude indicator, altimeter and throttle on the instrument strip. The terrain below is not scenery: clip a ridge and you lose a life. Every ring is worth 100 × your combo; three lives, and the world quickens a level every 25 seconds.

- Steer with ← → or A / D, climb and dive with ↑ ↓ or W / S; hold the mouse and the plane follows it.
- Space or click starts, P pauses. Best score is kept in the browser.

## Run it

Serve `game/` with any static server and open it in a desktop browser:

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

Or hand the entry in exactly as the grader does (Node 22):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

No build step, no network requests, no libraries — plain canvas 2D and ES modules.
