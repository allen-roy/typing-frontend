import { Component, ElementRef, OnDestroy, signal, viewChild } from '@angular/core';

const CHARS = '01{}[]()<>;=+-*/&|$#ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ';
const FONT_SIZE = 16;
const STEP_MS = 40;

@Component({
  selector: 'app-matrix-rain',
  standalone: true,
  template: `<canvas #c class="rain" [class.show]="visible()"></canvas>`,
  styles: [`
    .rain {
      position: fixed; inset: 0; width: 100vw; height: 100vh;
      pointer-events: none; opacity: 0; transition: opacity 300ms; z-index: 1000;
    }
    .rain.show { opacity: 1; }
  `],
})
export class MatrixRain implements OnDestroy {
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('c');
  visible = signal(false);
  private running = false;
  private raf = 0;

  play(durationMs = 1400): void {
    if (this.running) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const el = this.canvas().nativeElement;
    el.width = window.innerWidth;
    el.height = window.innerHeight;
    const ctx = el.getContext('2d');
    if (!ctx) return;

    const columns = Math.floor(el.width / FONT_SIZE);
    const drops = Array.from({ length: columns }, () => -Math.random() * 40);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, el.width, el.height);

    this.running = true;
    this.visible.set(true);
    let last = 0;

    const frame = (t: number) => {
      if (!this.running) return;
      if (t - last >= STEP_MS) {
        last = t;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fillRect(0, 0, el.width, el.height);
        ctx.fillStyle = '#00ff41';
        ctx.font = `${FONT_SIZE}px monospace`;
        for (let i = 0; i < columns; i++) {
          const ch = CHARS[Math.floor(Math.random() * CHARS.length)]!;
          ctx.fillText(ch, i * FONT_SIZE, drops[i]! * FONT_SIZE);
          if (drops[i]! * FONT_SIZE > el.height && Math.random() > 0.975) drops[i] = 0;
          drops[i]! += 1;
        }
      }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);

    setTimeout(() => this.visible.set(false), durationMs);
    setTimeout(() => this.stop(), durationMs + 350);
  }

  private stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}