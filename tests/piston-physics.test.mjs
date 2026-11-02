import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pistonState } from '../src/scripts/piston-physics.ts';

const near = (actual, expected, tolerance = 1e-8) => assert.ok(
  Math.abs(actual - expected) < tolerance, `${actual} should equal ${expected}`,
);
const processes = ['isobaric', 'isochoric', 'isothermal'];

test('Every path obeys the ideal-gas law, first law, and its fixed constraint', () => {
  for (const process of processes) for (const target of [.5, .9, 1.2, 2]) {
    for (let step = 0; step <= 100; step++) {
      const s = pistonState(process, step / 100, target);
      near(s.pressure * s.volume, (10 / 3) * s.temperature);
      near(s.heat, s.internal + s.work);
      if (process === 'isobaric') near(s.pressure, 100);
      if (process === 'isochoric') { near(s.volume, 10); near(s.work, 0); }
      if (process === 'isothermal') { near(s.temperature, 300); near(s.internal, 0); }
    }
  }
});

test('Analytic work agrees with independently integrated P-V area in both directions', () => {
  for (const process of processes) for (const target of [.5, 2]) {
    let area = 0, previous = pistonState(process, 0, target);
    for (let step = 1; step <= 10000; step++) {
      const s = pistonState(process, step / 10000, target);
      area += (previous.pressure + s.pressure) / 2 * (s.volume - previous.volume);
      previous = s;
    }
    near(area, previous.work, .0001);
  }
});

test('Classroom examples have the expected energies and work ordering', () => {
  const baric = pistonState('isobaric', 1, 2);
  const choric = pistonState('isochoric', 1, 2);
  const thermal = pistonState('isothermal', 1, 2);
  near(baric.work, 1000); near(baric.internal, 1500); near(baric.heat, 2500);
  near(choric.work, 0); near(choric.heat, 1500);
  near(thermal.work, 1000 * Math.log(2)); near(thermal.heat, thermal.work);
  assert.ok(baric.work > thermal.work && thermal.work > choric.work);
  near(pistonState('isobaric', 1, .5).work, -500);
  near(pistonState('isothermal', 1, .5).work, -1000 * Math.log(2));
});

test('Progress endpoints are clamped and every experiment starts from the same state', () => {
  for (const process of processes) {
    const initial = pistonState(process, 0, 2);
    near(initial.pressure, 100); near(initial.volume, 10); near(initial.temperature, 300);
    near(initial.work, 0); near(initial.heat, 0);
    assert.deepEqual(pistonState(process, -1, 2), initial);
    assert.deepEqual(pistonState(process, 2, 2), pistonState(process, 1, 2));
  }
});
