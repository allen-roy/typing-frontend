import { Component, signal, computed, OnDestroy } from '@angular/core';
import {
  createTestState,
  handleKeystroke,
  handleBackspace,
  isTestComplete,
  calculateWPM,
  calculateAccuracy,
} from './engine';

const SENTENCES = [
  'The quick brown fox jumps over the lazy dog.',
  'Practice makes progress, so keep typing every single day.',
  'A small step each morning builds a habit that lasts.',
];

function newTest() {
  const text = SENTENCES[Math.floor(Math.random() * SENTENCES.length)]!;
  return createTestState(text, 'words', undefined, text.split(' ').length);
}

@Component({
  selector: 'app-typing-test',
  standalone: true,
  template: `
    <div class="typing-test" (click)="typingInput.focus()">
      <h2>Typing Test</h2>

      <div class="text-display">
        @for (char of state().text; track $index) {
          <span
            [class.correct]="$index < state().currentIndex && state().typed[$index] === char"
            [class.wrong]="$index < state().currentIndex && state().typed[$index] !== char"
            [class.untyped]="$index >= state().currentIndex"
            [class.current]="$index === state().currentIndex"
          >{{ char }}</span>
        }
      </div>

      <input
        #typingInput
        type="text"
        class="typing-input"
        aria-label="Type the displayed sentence"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        autofocus
        (keydown)="onKeydown($event)"
      />

      <div class="stats">
        <p>WPM: {{ wpm() }}</p>
        <p>Accuracy: {{ accuracy() }}%</p>
      </div>

      @if (finished()) {
        <div class="results">
          <strong>Done!</strong>
          <button type="button" (click)="restart()">Restart (Esc)</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .typing-test { max-width: 700px; margin: 40px auto; padding: 24px; font-family: sans-serif; cursor: text; }
    .text-display { font-size: 24px; line-height: 1.8; overflow-wrap: anywhere; white-space: pre-wrap; }
    .untyped { color: #888; }
    .correct { color: #16a34a; }
    .wrong { color: #dc2626; background: #fee2e2; }
    .current { box-shadow: -2px 0 0 #2563eb; }
    .typing-input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .stats { display: flex; gap: 24px; margin-top: 24px; font-size: 18px; }
    .results { margin-top: 16px; display: flex; gap: 16px; align-items: center; }
  `]
})
export class TypingTest implements OnDestroy {
  state = signal(newTest());
  finishedAt = signal<number | null>(null);
  finished = computed(() => this.finishedAt() !== null);

  private tick = signal(Date.now());
  private clock = computed(() => this.finishedAt() ?? this.tick());
  private timerId = setInterval(() => this.onTick(), 250);

  wpm = computed(() => Math.round(calculateWPM(this.state(), this.clock())));
  accuracy = computed(() => Math.round(calculateAccuracy(this.state())));

  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.restart();
      return;
    }

    if (this.finished()) return;

    if (event.key === 'Backspace') {
      event.preventDefault();
      this.state.set(handleBackspace(this.state()));
      return;
    }

    if (event.key.length !== 1) return;

    event.preventDefault();
    const now = Date.now();
    const next = handleKeystroke(this.state(), event.key, now);
    this.state.set(next);
    if (isTestComplete(next, now)) this.finishedAt.set(now);
  }

  restart(): void {
    this.state.set(newTest());
    this.finishedAt.set(null);
  }

  private onTick(): void {
    const now = Date.now();
    this.tick.set(now);
    if (!this.finished() && isTestComplete(this.state(), now)) {
      this.finishedAt.set(now);
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.timerId);
  }
}