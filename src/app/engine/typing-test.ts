import {
  Component, signal, computed, effect, viewChild, ElementRef, OnDestroy,
} from '@angular/core';
import {
  createTestState, handleKeystroke, handleBackspace, skipIndent,
  isTestComplete, calculateWPM, calculateAccuracy,
} from './engine';
import { generateText } from './words';
import { LANGS, Lang, randomSnippet } from './snippets';

type Mode = 'timed' | 'words' | 'dev';
interface Config { mode: Mode; amount: number; lang: Lang }

const OPTIONS = { timed: [15, 30, 60], words: [10, 25, 50] };
const THEMES = ['dark', 'light', 'ocean'] as const;
type Theme = (typeof THEMES)[number];
const LINE_PX = 24 * 1.8;

function newTest(c: Config) {
  if (c.mode === 'timed') {
    return createTestState(generateText(150), 'timed', c.amount);
  }
  if (c.mode === 'dev') {
    return createTestState(randomSnippet(c.lang), 'words', undefined, 0);
  }
  return createTestState(generateText(c.amount), 'words', undefined, c.amount);
}

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme');
    if (saved && (THEMES as readonly string[]).includes(saved)) return saved as Theme;
  } catch { /* storage unavailable */ }
  return 'dark';
}

@Component({
  selector: 'app-typing-test',
  standalone: true,
  template: `
    <div class="typing-test" (click)="typingInput.focus()">
      <div class="controls">
        @for (m of modes; track m) {
          <button type="button" [class.active]="config().mode === m"
                  (click)="setMode(m)">{{ m }}</button>
        }
        <span class="divider"></span>
        @if (config().mode === 'dev') {
          @for (l of langs; track l) {
            <button type="button" [class.active]="config().lang === l"
                    (click)="setLang(l)">{{ l }}</button>
          }
        } @else {
          @for (n of amounts(); track n) {
            <button type="button" [class.active]="config().amount === n"
                    (click)="setAmount(n)">{{ n }}</button>
          }
        }
        <span class="spacer"></span>
        @for (t of themes; track t) {
          <button type="button" [class.active]="theme() === t"
                  (click)="theme.set(t)">{{ t }}</button>
        }
      </div>

      @if (timeLeft() !== null) {
        <p class="timer">{{ timeLeft() }}s</p>
      }

      <div #display class="text-display" [class.dev]="config().mode === 'dev'">
        @for (char of state().text; track $index) {
          <span
            [class.correct]="$index < state().currentIndex && state().typed[$index] === char"
            [class.wrong]="$index < state().currentIndex && state().typed[$index] !== char"
            [class.untyped]="$index >= state().currentIndex"
            [class.current]="$index === state().currentIndex"
          >{{ show(char) }}</span>
        }
      </div>

      <input
        #typingInput
        type="text"
        class="typing-input"
        aria-label="Type the displayed text"
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
    .typing-test { max-width: 760px; margin: 40px auto; padding: 24px; cursor: text; }
    .controls { display: flex; gap: 12px; align-items: center; margin-bottom: 24px; flex-wrap: wrap; }
    .controls .spacer { flex: 1; }
    .controls .divider { width: 1px; height: 18px; background: var(--muted); }
    button { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 16px; }
    button.active { color: var(--accent); }
    .timer { color: var(--accent); font-size: 28px; margin: 0 0 8px; }
    .text-display {
      position: relative; height: 130px; overflow: hidden;
      font-size: 24px; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere;
    }
    .text-display.dev { height: 300px; font-family: monospace; font-size: 20px; }
    .untyped { color: var(--muted); }
    .correct { color: var(--correct); }
    .wrong { color: var(--wrong); background: var(--wrong-bg); }
    .current { box-shadow: -2px 0 0 var(--accent); }
    .typing-input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .stats { display: flex; gap: 24px; margin-top: 24px; font-size: 18px; }
    .results { margin-top: 16px; display: flex; gap: 16px; align-items: center; }
  `]
})
export class TypingTest implements OnDestroy {
  modes: Mode[] = ['timed', 'words', 'dev'];
  langs = LANGS;
  themes = THEMES;

  config = signal<Config>({ mode: 'timed', amount: 30, lang: 'javascript' });
  theme = signal<Theme>(loadTheme());
  state = signal(newTest(this.config()));
  finishedAt = signal<number | null>(null);
  finished = computed(() => this.finishedAt() !== null);

  amounts = computed(() => {
    const m = this.config().mode;
    return m === 'dev' ? [] : OPTIONS[m];
  });

  private display = viewChild.required<ElementRef<HTMLElement>>('display');
  private tick = signal(Date.now());
  private clock = computed(() => this.finishedAt() ?? this.tick());
  private timerId = setInterval(() => this.onTick(), 250);

  wpm = computed(() => Math.round(calculateWPM(this.state(), this.clock())));
  accuracy = computed(() => Math.round(calculateAccuracy(this.state())));
  timeLeft = computed(() => {
    const s = this.state();
    if (s.mode !== 'timed' || s.duration === undefined) return null;
    if (s.startTime === null) return s.duration;
    return Math.max(0, Math.ceil((s.duration * 1000 - (this.clock() - s.startTime)) / 1000));
  });

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.dataset['theme'] = t;
      try { localStorage.setItem('theme', t); } catch { /* ignore */ }
    });
  }

  show(char: string): string {
    return char === '\n' ? '↵\n' : char;
  }

  setMode(mode: Mode): void {
    const amount = mode === 'dev' ? 0 : OPTIONS[mode][0]!;
    this.config.update(c => ({ ...c, mode, amount }));
    this.restart();
  }

  setAmount(amount: number): void {
    this.config.update(c => ({ ...c, amount }));
    this.restart();
  }

  setLang(lang: Lang): void {
    this.config.update(c => ({ ...c, lang }));
    this.restart();
  }

  restart(): void {
    this.state.set(newTest(this.config()));
    this.finishedAt.set(null);
    this.display().nativeElement.scrollTop = 0;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.restart();
      return;
    }

    // Keep Tab from moving focus out of the hidden input.
    if (event.key === 'Tab') {
      event.preventDefault();
      return;
    }

    if (this.finished()) return;

    if (event.key === 'Backspace') {
      event.preventDefault();
      this.state.set(handleBackspace(this.state()));
      setTimeout(() => this.scrollToCurrent());
      return;
    }

    const char = event.key === 'Enter' ? '\n' : event.key;
    if (char.length !== 1) return;

    event.preventDefault();
    const now = Date.now();
    let next = handleKeystroke(this.state(), char, now);

    // After a correct Enter, fill in the next line's indentation for free.
    const last = next.keystrokes[next.keystrokes.length - 1];
    if (char === '\n' && last?.char === '\n' && last.correct) {
      next = skipIndent(next);
    }

    this.state.set(next);
    if (isTestComplete(next, now)) this.finish(next, now);
    setTimeout(() => this.scrollToCurrent());
  }

  private onTick(): void {
    const now = Date.now();
    this.tick.set(now);
    const s = this.state();
    if (!this.finished() && isTestComplete(s, now)) this.finish(s, now);
  }

  private finish(s: ReturnType<typeof newTest>, now: number): void {
    const limit =
      s.mode === 'timed' && s.startTime !== null && s.duration !== undefined
        ? s.startTime + s.duration * 1000
        : now;
    this.finishedAt.set(Math.min(now, limit));
  }

  private scrollToCurrent(): void {
    const box = this.display().nativeElement;
    const cur = box.querySelector<HTMLElement>('.current');
    if (cur) box.scrollTop = Math.max(0, cur.offsetTop - LINE_PX);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerId);
  }
}