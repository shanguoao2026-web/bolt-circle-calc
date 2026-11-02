# bolt-circle-calc

A TypeScript CLI for bolt circle (PCD) hole coordinates in drilling and CNC setup. Requires Node.js 18+ and npm. No runtime dependencies.

```sh
npm install
npm test
node dist/cli.js --pcd 100 --holes 4
```

`npm test` builds the CLI and runs the `node:test` suite. To build alone, run `npm run build`. The package executable is `bolt-circle-calc` and points to `dist/cli.js`; use `npm link` to make it available locally.

```text
hole    angle (deg)    X (mm)     Y (mm)
1       0.000          50.000     0.000
2       90.000         0.000      50.000
3       180.000        -50.000    0.000
4       270.000        0.000      -50.000
Chord (mm): 70.711
```

Options:

| Flag | Meaning | Default |
| --- | --- | --- |
| `--pcd <mm>` | Positive finite bolt circle diameter | Required |
| `--holes <n>` | Integer hole count, at least 2 | Required |
| `--start <deg>` | First hole angle measured from +X | `0` |
| `--dir ccw\|cw` | Counterclockwise or clockwise | `ccw` |
| `--cx <mm>` | Centre X | `0` |
| `--cy <mm>` | Centre Y | `0` |
| `--decimals <n>` | Decimal places, integer 0–6 | `3` |
| `--csv` | CSV with `hole,angle_deg,x,y` header | Table |
| `--json` | JSON object with `holes` and `chord` | Table |
| `--help` | Show usage without required inputs | |

```sh
node dist/cli.js --pcd 100 --holes 6 --csv
node dist/cli.js --pcd 80 --holes 3 --start 90 --cx 10 --cy 20 --json
node dist/cli.js --pcd 100 --holes 4 --dir cw --decimals 6
```

Coordinates use `r = pcd / 2`, `x = cx + r*cos(angle)`, and `y = cy + r*sin(angle)`. Hole angles advance by `360 / holes`, with positive steps for ccw and negative steps for cw, normalized to [0, 360). The adjacent hole chord is `pcd*sin(π/holes)`.

Table and CSV values have fixed decimal places; JSON values are rounded numbers (so trailing zeros are omitted). Negative zero becomes zero. Angles that round to 360 are displayed as 0. CSV contains hole rows only; table and JSON include the chord. Invalid arguments produce an error on stderr and exit status 1. Use only one output format flag.

Licensed under the MIT License. Copyright (c) 2026 shanguoao2026-web.
