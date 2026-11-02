# bolt-circle-calc

Build a small TypeScript Node CLI (Node 18+, no runtime deps; devDeps typescript + @types/node only; tests with node:test) that computes hole coordinates on a bolt circle (PCD) for drilling / CNC setup.

Inputs: --pcd <mm> bolt circle diameter (required), --holes <n> integer >= 2 (required), --start <deg> angle of hole 1 measured from +X axis (default 0), --dir ccw|cw (default ccw), --cx <mm> --cy <mm> circle centre (default 0,0), --decimals <n> integer 0..6 (default 3), --csv (print "hole,angle_deg,x,y" CSV), --json, --help.
Formulas: r = pcd/2; angle_i = start ± (i-1)·360/n (+ for ccw, − for cw), normalised to [0,360); x = cx + r·cos, y = cy + r·sin. Adjacent hole chord = pcd·sin(π/n). Round -0 to 0 in output.
- Validate finite numbers; pcd <= 0, holes < 2 or non-integer, bad dir, decimals out of range → error to stderr, exit 1.
- Table output by default (hole, angle, X, Y, then chord), README with examples, MIT LICENSE (author shanguoao2026-web), .gitignore with node_modules/ dist/ *.log .npm-cache/.
- package.json "bin" must point to the built CLI. npm test must build and pass. No secrets, no personal info.

Check values (must be in tests):
- pcd100 holes4 → (50,0) (0,50) (-50,0) (0,-50); chord 70.711.
- pcd100 holes6 → hole2 at 60° (25.000, 43.301); chord 50.000.
- pcd80 holes3 start90 cx10 cy20 → hole1 (10,60), hole2 210° (-24.641, 0), hole3 330° (44.641, 0); chord 69.282.
- pcd100 holes4 dir cw → hole2 at 270° (0,-50).
- holes 0, holes 1, holes 2.5, pcd 0, dir up, decimals 9 → exit 1.
