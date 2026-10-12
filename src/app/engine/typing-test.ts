import { MatrixRain } from './matrix-rain';
import {
  Component, signal, computed, effect, viewChild, ElementRef, OnDestroy,
} from '@angular/core';
import {
  createTestState, handleKeystroke, handleBackspace, skipIndent,
  isTestComplete, calculateWPM, calculateAccuracy, wpmSeries,
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
  imports: [MatrixRain],
  template: `
    <div class="typing-test" (click)="typingInput.focus()">
    <app-matrix-rain />
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

      @if (isTouch) {
        <p class="hint">TypeEngine works best with a desktop keyboard.</p>
      }

      <div class="stage" [class.dev]="config().mode === 'dev'">
        @if (result(); as r) {
          <div class="results">
            <p class="label">{{ r.label }}</p>
            <div class="big-stats">
              <div><span class="big">{{ r.wpm }}</span><span class="cap">wpm</span></div>
              <div><span class="big">{{ r.accuracy }}%</span><span class="cap">accuracy</span></div>
            </div>
            <div class="small-stats">
              <span>correct <b>{{ r.correct }}</b></span>
              <span>wrong <b>{{ r.wrong }}</b></span>
              <span>time <b>{{ r.seconds }}s</b></span>
            </div>
            <svg class="graph" viewBox="0 0 600 140" preserveAspectRatio="none">
              <polyline [attr.points]="graph().points" vector-effect="non-scaling-stroke" />
            </svg>
            <div class="graph-labels">
              <span>0s</span>
              <span>peak {{ graph().max }} wpm</span>
              <span>{{ graph().seconds }}s</span>
            </div>
            <button type="button" class="restart" (click)="restart()">Restart (Enter or Esc)</button>
          </div>
        } @else {
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
          <div class="stats">
            <p>WPM: {{ wpm() }}</p>
            <p>Accuracy: {{ accuracy() }}%</p>
          </div>
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
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; max-width: 760px; }
    .typing-test { padding: 24px; cursor: text; box-sizing: border-box; }
    .controls { display: flex; gap: 12px; align-items: center; margin-bottom: 24px; flex-wrap: wrap; }
    .controls .spacer { flex: 1; }
    .controls .divider { width: 1px; height: 18px; background: var(--muted); }
    button { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 16px; }
    button.active { color: var(--accent); }
    .hint { color: var(--muted); font-size: 14px; margin: 0 0 12px; }

    .stage { min-height: 190px; }
    .stage.dev { min-height: 350px; }

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

    .results .label { color: var(--muted); margin: 0 0 8px; }
    .big-stats { display: flex; gap: 48px; margin-bottom: 12px; }
    .big { font-size: 56px; color: var(--accent); line-height: 1; margin-right: 8px; }
    .cap { color: var(--muted); }
    .small-stats { display: flex; gap: 24px; color: var(--muted); margin-bottom: 16px; flex-wrap: wrap; }
    .small-stats b { color: var(--text); font-weight: normal; }
    .graph { width: 100%; height: 100px; display: block; }
    .graph polyline { fill: none; stroke: var(--accent); stroke-width: 2; }
    .graph-labels { display: flex; justify-content: space-between; color: var(--muted); font-size: 13px; margin-top: 4px; }
    .restart { margin-top: 16px; color: var(--accent); }
  `]
})
export class TypingTest implements OnDestroy {
  modes: Mode[] = ['timed', 'words', 'dev'];
  langs = LANGS;
  themes = THEMES;
  isTouch =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  config = signal<Config>({ mode: 'timed', amount: 30, lang: 'javascript' });
  theme = signal<Theme>(loadTheme());
  state = signal(newTest(this.config()));
  finishedAt = signal<number | null>(null);
  finished = computed(() => this.finishedAt() !== null);

  amounts = computed(() => {
    const m = this.config().mode;
    return m === 'dev' ? [] : OPTIONS[m];
  });

  private display = viewChild<ElementRef<HTMLElement>>('display');
  private rain = viewChild.required(MatrixRain);
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

  result = computed(() => {
    const end = this.finishedAt();
    const s = this.state();
    if (end === null || s.startTime === null) return null;
    const c = this.config();
    const correct = s.keystrokes.filter(k => k.correct).length;
    return {
      wpm: Math.round(calculateWPM(s, end)),
      accuracy: Math.round(calculateAccuracy(s)),
      correct,
      wrong: s.keystrokes.length - correct,
      seconds: ((end - s.startTime) / 1000).toFixed(1),
      label:
        c.mode === 'dev' ? `dev · ${c.lang}`
        : c.mode === 'timed' ? `timed · ${c.amount}s`
        : `words · ${c.amount}`,
    };
  });

  graph = computed(() => {
    const end = this.finishedAt();
    if (end === null) return { points: '', max: 0, seconds: 0 };
    const series = wpmSeries(this.state(), end);
    const max = Math.max(1, ...series);
    const W = 600, H = 140;
    const pts = series.map((v, i) => {
      const x = series.length === 1 ? W / 2 : (i / (series.length - 1)) * W;
      const y = H - (v / max) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return { points: pts.join(' '), max: Math.round(max), seconds: series.length };
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
  const apply = () => {
    const amount = mode === 'dev' ? 0 : OPTIONS[mode][0]!;
    this.config.update(c => ({ ...c, mode, amount }));
    this.restart();
  };
  if (mode === 'dev' && this.config().mode !== 'dev') {
    this.rain().play(1400);
    setTimeout(apply, 450);
  } else {
    apply();
  }
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
    const box = this.display();
    if (box) box.nativeElement.scrollTop = 0;
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

    if (this.finished()) {
      // Short guard so a habitual Enter right at the end doesn't skip the results.
      const sinceFinish = Date.now() - (this.finishedAt() ?? 0);
      if (event.key === 'Enter' && sinceFinish > 500) {
        event.preventDefault();
        this.restart();
      }
      return;
    }

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
    const box = this.display()?.nativeElement;
    const cur = box?.querySelector<HTMLElement>('.current');
    if (box && cur) box.scrollTop = Math.max(0, cur.offsetTop - LINE_PX);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerId);
  }
}