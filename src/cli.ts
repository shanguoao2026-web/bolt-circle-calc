#!/usr/bin/env node

const help = `Usage: bolt-circle-calc --pcd <mm> --holes <n> [options]

Calculate bolt-circle hole coordinates in millimetres.
  --pcd <mm>       Positive bolt circle diameter (required)
  --holes <n>      Integer hole count, at least 2 (required)
  --start <deg>    Hole 1 angle from +X (default: 0)
  --dir ccw|cw    Direction (default: ccw)
  --cx <mm>       Centre X (default: 0)
  --cy <mm>       Centre Y (default: 0)
  --decimals <n>   Decimal places, 0..6 (default: 3)
  --csv            Output hole,angle_deg,x,y CSV
  --json           Output coordinates and chord as JSON
  --help           Show this help
`;

function main(args: string[]): void {
  if (args.includes('--help')) {
    process.stdout.write(help);
    return;
  }
  const values = new Map<string, string>();
  const numeric = ['--pcd', '--holes', '--start', '--cx', '--cy', '--decimals'];
  let format = 'table';
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--csv' || key === '--json') {
      if (format !== 'table') throw new Error('Choose only one output format.');
      format = key.slice(2);
    } else if (numeric.includes(key) || key === '--dir') {
      if (values.has(key)) throw new Error(`Duplicate option: ${key}`);
      const value = args[++i];
      if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
      values.set(key, value);
    } else {
      throw new Error(`Unknown option: ${key}`);
    }
  }
  function number(key: string, fallback?: number): number {
    const value = values.get(key);
    if (value === undefined) {
      if (fallback !== undefined) return fallback;
      throw new Error(`Required option: ${key}`);
    }
    const parsed = Number(value);
    if (value.trim() === '' || !Number.isFinite(parsed)) throw new Error(`${key} must be a finite number.`);
    return parsed;
  }
  const pcd = number('--pcd');
  const count = number('--holes');
  const start = number('--start', 0);
  const cx = number('--cx', 0);
  const cy = number('--cy', 0);
  const decimals = number('--decimals', 3);
  const dir = values.get('--dir') ?? 'ccw';
  if (pcd <= 0) throw new Error('--pcd must be positive.');
  if (!Number.isSafeInteger(count) || count < 2) throw new Error('--holes must be an integer >= 2.');
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) throw new Error('--decimals must be an integer from 0 to 6.');
  if (dir !== 'ccw' && dir !== 'cw') throw new Error('--dir must be ccw or cw.');
  const normalize = (angle: number): number => ((angle % 360) + 360) % 360;
  const round = (value: number): number => {
    if (!Number.isFinite(value)) throw new Error('Calculated coordinate exceeds the finite number range.');
    const rounded = Number(value.toFixed(decimals));
    return Object.is(rounded, -0) ? 0 : rounded;
  };
  const fixed = (value: number): string => round(value).toFixed(decimals);
  const holes = [];
  for (let i = 0; i < count; i++) {
    const angle = normalize(normalize(start) + (dir === 'ccw' ? 1 : -1) * i * (360 / count));
    const radians = angle * Math.PI / 180;
    holes.push({
      hole: i + 1,
      angle_deg: normalize(round(angle)),
      x: round(cx + pcd / 2 * Math.cos(radians)),
      y: round(cy + pcd / 2 * Math.sin(radians)),
    });
  }
  const chord = round(pcd * Math.sin(Math.PI / count));
  if (format === 'json') {
    console.log(JSON.stringify({ holes, chord }, null, 2));
  } else if (format === 'csv') {
    console.log('hole,angle_deg,x,y');
    for (const h of holes) console.log(`${h.hole},${fixed(h.angle_deg)},${fixed(h.x)},${fixed(h.y)}`);
  } else {
    console.log('hole\tangle (deg)\tX (mm)\tY (mm)');
    for (const h of holes) console.log(`${h.hole}\t${fixed(h.angle_deg)}\t${fixed(h.x)}\t${fixed(h.y)}`);
    console.log(`Chord (mm): ${fixed(chord)}`);
  }
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
