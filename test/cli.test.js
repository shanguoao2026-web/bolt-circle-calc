import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, openSync, closeSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// File descriptors also work in sandboxes that restrict child-process pipes.
const run = (...args) => {
  const directory = mkdtempSync(join(tmpdir(), 'bolt-circle-test-'));
  const stdoutPath = join(directory, 'stdout');
  const stderrPath = join(directory, 'stderr');
  const out = openSync(stdoutPath, 'w');
  const err = openSync(stderrPath, 'w');
  try {
    const result = spawnSync(process.execPath, ['dist/cli.js', ...args.map(String)], {
      stdio: ['ignore', out, err],
    });
    if (result.error) throw result.error;
    return { status: result.status, stdout: readFileSync(stdoutPath, 'utf8'), stderr: readFileSync(stderrPath, 'utf8') };
  } finally {
    closeSync(out);
    closeSync(err);
    rmSync(directory, { recursive: true, force: true });
  }
};
const json = (...args) => {
  const result = run('--pcd', 100, '--holes', 4, ...args, '--json');
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
};

test('100 mm, four holes: all coordinates and chord', () => {
  const result = json();
  assert.deepEqual(result.holes, [
    { hole: 1, angle_deg: 0, x: 50, y: 0 },
    { hole: 2, angle_deg: 90, x: 0, y: 50 },
    { hole: 3, angle_deg: 180, x: -50, y: 0 },
    { hole: 4, angle_deg: 270, x: 0, y: -50 },
  ]);
  assert.equal(result.chord, 70.711);
});

test('100 mm, six holes: second coordinate and chord', () => {
  const result = run('--pcd', 100, '--holes', 6, '--json');
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.deepEqual(data.holes[1], { hole: 2, angle_deg: 60, x: 25, y: 43.301 });
  assert.equal(data.chord, 50);
});

test('80 mm, three holes, start 90 and offset centre', () => {
  const result = run('--pcd', 80, '--holes', 3, '--start', 90, '--cx', 10, '--cy', 20, '--json');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    holes: [
      { hole: 1, angle_deg: 90, x: 10, y: 60 },
      { hole: 2, angle_deg: 210, x: -24.641, y: 0 },
      { hole: 3, angle_deg: 330, x: 44.641, y: 0 },
    ], chord: 69.282,
  });
});

test('clockwise second hole is at 270 degrees', () => {
  assert.deepEqual(json('--dir', 'cw').holes[1], { hole: 2, angle_deg: 270, x: 0, y: -50 });
});

for (const args of [
  ['--holes', 0], ['--holes', 1], ['--holes', 2.5], ['--pcd', 0],
  ['--dir', 'up'], ['--decimals', 9], ['--pcd', -1], ['--holes', 'NaN'],
  ['--start', 'Infinity'], ['--cx', 'abc'], ['--cy', '-Infinity'],
  ['--decimals', -1], ['--decimals', 1.5], ['--pcd', ''],
]) {
  test(`reject invalid input ${args.join(' ')}`, () => {
    const base = ['--pcd', 100, '--holes', 4];
    const index = base.indexOf(args[0]);
    if (index >= 0) base.splice(index, 2);
    const result = run(...base, ...args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^Error:/);
    assert.equal(result.stdout, '');
  });
}

for (const args of [[], ['--pcd', 100], ['--holes', 4], ['--pcd'], ['--unknown'], ['--pcd', 100, '--holes', 4, '--csv', '--json']]) {
  test(`reject missing or malformed options: ${args.join(' ')}`, () => {
    const result = run(...args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^Error:/);
  });
}

test('CSV has fixed precision and no negative zero or chord footer', () => {
  const result = run('--pcd', 100, '--holes', 4, '--csv');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'hole,angle_deg,x,y\n1,0.000,50.000,0.000\n2,90.000,0.000,50.000\n3,180.000,-50.000,0.000\n4,270.000,0.000,-50.000\n');
});

test('default table includes chord and units', () => {
  const result = run('--pcd', 100, '--holes', 6);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /2\t60.000\t25.000\t43.301/);
  assert.match(result.stdout, /Chord \(mm\): 50.000/);
});

test('angles wrap, precision endpoints work, and negative centres are accepted', () => {
  assert.equal(json('--start', -450).holes[0].angle_deg, 270);
  assert.equal(json('--start', 720).holes[0].angle_deg, 0);
  assert.equal(json('--start', 359.9999).holes[0].angle_deg, 0);
  assert.equal(json('--decimals', 0, '--cx', -10, '--cy', -20).holes[0].x, 40);
  assert.equal(json('--decimals', 6).chord, 70.710678);
});

test('help succeeds without required arguments', () => {
  const result = run('--help');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
  assert.equal(result.stderr, '');
});
