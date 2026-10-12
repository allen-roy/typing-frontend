import type { TypingEngineState } from './types.js';

export function createTestState(
  text: string,
  mode: 'timed' | 'words',
  duration?: number,
  wordCount?: number
): TypingEngineState {
  return {
    text: text.split(''),
    typed: [],
    currentIndex: 0,
    startTime: null,
    keystrokes: [],
    mode,
    duration,
    wordCount,
  };
}

export function isTestComplete(state: TypingEngineState, now: number): boolean {
  if (state.currentIndex >= state.text.length) return true;
  if (state.mode === 'timed') {
    if (state.startTime === null || state.duration === undefined) return false;
    return now - state.startTime >= state.duration * 1000;
  }
  return false;
}

export function handleKeystroke(
  state: TypingEngineState,
  char: string,
  timestamp: number
): TypingEngineState {
  if (isTestComplete(state, timestamp)) return state;

  const correct = char === state.text[state.currentIndex];

  return {
    ...state,
    startTime: state.startTime ?? timestamp,
    typed: [...state.typed.slice(0, state.currentIndex), char],
    keystrokes: [...state.keystrokes, { char, correct, timestamp }],
    currentIndex: state.currentIndex + 1,
  };
}

export function handleBackspace(state: TypingEngineState): TypingEngineState {
  const newIndex = Math.max(0, state.currentIndex - 1);
  return {
    ...state,
    currentIndex: newIndex,
    typed: state.typed.slice(0, newIndex),
  };
}

export function calculateWPM(state: TypingEngineState, now: number): number {
  if (state.startTime === null) return 0;
  const minutes = (now - state.startTime) / 1000 / 60;
  if (minutes <= 0) return 0;
  const correct = state.keystrokes.filter(k => k.correct).length;
  return correct / 5 / minutes;
}

export function calculateAccuracy(state: TypingEngineState): number {
  if (state.keystrokes.length === 0) return 0;
  const correct = state.keystrokes.filter(k => k.correct).length;
  return (correct / state.keystrokes.length) * 100;
}

export function skipIndent(state: TypingEngineState): TypingEngineState {
  let i = state.currentIndex;
  const typed = state.typed.slice(0, i);
  while (state.text[i] === ' ') {
    typed.push(' ');
    i++;
  }
  return { ...state, currentIndex: i, typed };
}