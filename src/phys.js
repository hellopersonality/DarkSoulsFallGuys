// Movement constants shared by the engine and the level checker.
export const PHYS = {
  R: 0.45,        // player radius
  H: 1.6,         // standing height
  HS: 0.8,        // height while sliding (fits under high blades)
  STEP: 0.55,     // auto step-up height
  MOVE: 9.5,      // run speed
  ACCEL: 95,      // ground acceleration
  AIR: 40,        // air control
  JUMP: 12.5,     // first jump launch speed
  JUMP2: 10,      // double jump launch speed
  GRAV: -38,
  CUT: 2.3,       // gravity multiplier when jump is released early
  DASH: 18,       // air dash speed
  DASHT: 0.15,    // air dash duration (no gravity during it)
  DASHEND: 1.1,   // speed after a dash, as a multiple of MOVE
  SLIDE: 15,      // ground slide start speed
  SLIDET: 0.42,   // slide duration
  AIRDECAY: 7,    // how fast extra speed (from a slide jump) bleeds off in the air, m/s per second
  DASHCD: 0.3,    // cooldown between dashes/slides
};
