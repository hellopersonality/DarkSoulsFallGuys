# Ashen Gauntlet

A single-player 3D obstacle-course platformer for desktop browsers: Fall Guys-style movement in a Dark Souls world. No combat, just nine increasingly punishing stages from the town of Emberwick, through Castle Duskmoor, to the beacon at the top of the spire.

Play with WASD + Space + Shift + mouse, or any standard controller (left stick, A to jump, X to dash, right stick to look).

Moves: jump, double jump (jump again in the air), dash (Shift in the air), slide (Shift on the ground; fits under low gates and high blades), slide-jump (jump during a slide for a long jump). Lanterns are quick checkpoints between bonfires; respawn takes about a second.

## Structure

- `index.html`, `style.css`: page, HUD and menus
- `src/main.js`: game flow, input, audio, saves, update prompt (`BUILD` must match `version.json`)
- `src/engine.js`: three.js world builder, physics, hazards, camera
- `src/stages.js`: all nine stages as plain data
- `src/phys.js`: movement constants shared with the level checker
- `tools/validate.mjs`: proves every goal, checkpoint and soul is reachable with the real movement, and reports which jumps need double jump or dash
- `tools/sim.mjs`: headless test that checks jump distances against the checker, the slide gate, every respawn point, and runs every stage through the engine

## Releasing

1. Bump `BUILD` in `src/main.js` and `version` in `version.json` to the same value.
2. Run `node tools/validate.mjs && node tools/sim.mjs`.
3. Push. Open tabs see an update prompt within a few minutes.
