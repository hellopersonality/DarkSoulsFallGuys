# Ashen Gauntlet

A single-player 3D obstacle-course platformer for desktop browsers: Fall Guys-style movement in a Dark Souls world. No combat, just nine increasingly punishing stages from the town of Emberwick, through Castle Duskmoor, to the beacon at the top of the spire.

Play with WASD + Space + mouse, or any standard controller (left stick, A to jump, right stick to look).

## Structure

- `index.html`, `style.css`: page, HUD and menus
- `src/main.js`: game flow, input, audio, saves, update prompt (`BUILD` must match `version.json`)
- `src/engine.js`: three.js world builder, physics, hazards, camera
- `src/stages.js`: all nine stages as plain data
- `src/phys.js`: movement constants shared with the level checker
- `tools/validate.mjs`: proves every goal, bonfire and soul is reachable with the real jump physics
- `tools/sim.mjs`: headless smoke test that runs every stage through the engine

## Releasing

1. Bump `BUILD` in `src/main.js` and `version` in `version.json` to the same value.
2. Run `node tools/validate.mjs && node tools/sim.mjs`.
3. Push. Open tabs see an update prompt within a few minutes.
