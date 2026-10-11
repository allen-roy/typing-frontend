import { describe, it, expect } from 'vitest';
import type { TypingEngineState } from './types.js';
import {
  createTestState,
  handleKeystroke,
  handleBackspace,
  isTestComplete,
  calculateWPM,
  calculateAccuracy,
} from './engine.js';

// Types each character of `chars` in order, one second apart.
function typeAll(state: TypingEngineState, chars: string, startTs = 0): TypingEngineState {
  return chars
    .split('')
    .reduce((s, c, i) => handleKeystroke(s, c, startTs + i * 1000), state);
}

describe('handleKeystroke', () => {
  it('advances currentIndex when a correct character is typed', () => {
    const s = handleKeystroke(createTestState('abc', 'words', undefined, 3), 'a', 1000);
    expect(s.currentIndex).toBe(1);
  });

  it('advances and records correct:false for a wrong character', () => {
    const s = handleKeystroke(createTestState('abc', 'words', undefined, 3), 'x', 1000);
    expect(s.currentIndex).toBe(1);
    expect(s.keystrokes[0]?.correct).toBe(false);
  });

  it('sets startTime on the first keystroke only', () => {
    const s0 = createTestState('abc', 'words', undefined, 3);
    const s1 = handleKeystroke(s0, 'a', 1000);
    const s2 = handleKeystroke(s1, 'b', 2000);
    expect(s1.startTime).toBe(1000);
    expect(s2.startTime).toBe(1000);
  });

  it('records typed characters', () => {
    const s = typeAll(createTestState('abc', 'words', undefined, 3), 'ax');
    expect(s.typed).toEqual(['a', 'x']);
  });

  it('ignores keys once the text is finished', () => {
    const s = typeAll(createTestState('ab', 'words', undefined, 1), 'abz');
    expect(s.currentIndex).toBe(2);
    expect(s.keystrokes.length).toBe(2);
  });
});

describe('handleBackspace', () => {
  it('moves back, clears typed, but keeps keystroke history', () => {
    const s1 = typeAll(createTestState('abc', 'words', undefined, 3), 'x');
    const s2 = handleBackspace(s1);
    expect(s2.currentIndex).toBe(0);
    expect(s2.typed).toEqual([]);
    expect(s2.keystrokes.length).toBe(1);
  });

  it('never goes below zero', () => {
    const s = handleBackspace(createTestState('abc', 'words', undefined, 3));
    expect(s.currentIndex).toBe(0);
  });
});

describe('isTestComplete', () => {
  it('words mode: complete when all text typed', () => {
    const s = typeAll(createTestState('abc', 'words', undefined, 1), 'abc');
    expect(isTestComplete(s, 5000)).toBe(true);
  });

  it('timed mode: false before the duration, true at it', () => {
    const s = handleKeystroke(createTestState('abcdef', 'timed', 30), 'a', 1000);
    expect(isTestComplete(s, 30999)).toBe(false);
    expect(isTestComplete(s, 31000)).toBe(true);
  });
});

describe('calculateWPM', () => {
  it('5 correct chars in exactly one minute is 1 WPM', () => {
    let s = createTestState('abcdef', 'words', undefined, 1);
    s = handleKeystroke(s, 'a', 0);
    s = handleKeystroke(s, 'b', 15000);
    s = handleKeystroke(s, 'c', 30000);
    s = handleKeystroke(s, 'd', 45000);
    s = handleKeystroke(s, 'e', 60000);
    expect(calculateWPM(s, 60000)).toBe(1);
  });

  it('returns 0 before the test starts', () => {
    expect(calculateWPM(createTestState('abc', 'words', undefined, 1), 1000)).toBe(0);
  });
});

describe('calculateAccuracy', () => {
  it('100 when everything is correct', () => {
    const s = typeAll(createTestState('abcd', 'words', undefined, 1), 'abcd');
    expect(calculateAccuracy(s)).toBe(100);
  });

  it('50 when 2 of 4 are correct', () => {
    const s = typeAll(createTestState('abcd', 'words', undefined, 1), 'axcy');
    expect(calculateAccuracy(s)).toBe(50);
  });

  it('0 when nothing typed', () => {
    expect(calculateAccuracy(createTestState('abc', 'words', undefined, 1))).toBe(0);
  });
});