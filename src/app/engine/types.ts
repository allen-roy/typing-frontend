export interface TypingEngineState {
  text: string[];
  typed: string[];
  currentIndex: number;
  startTime: number | null;
  keystrokes: { char: string; correct: boolean; timestamp: number }[];
  mode: 'timed' | 'words';
  duration?: number;
  wordCount?: number;
}