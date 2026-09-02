/**
 * Film-grain overlay — a small (420x280) noise buffer redrawn ~12x/sec
 * and stretched to fill the viewport via CSS, so the grain reads as
 * coarse photographic noise rather than full-resolution static. The one
 * tunable (setIntensity) maps to the overlay's CSS opacity: BlackholeAnimation's
 * default of 0.016 was previously a magic literal on the canvas element;
 * this class owns it as a settable value driven by the "Grain" slider.
 */
export class FilmGrain {
  private static readonly BUFFER_WIDTH = 420;
  private static readonly BUFFER_HEIGHT = 280;
  private static readonly REDRAW_INTERVAL_MS = 83;

  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly imageData: ImageData | null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly reduced: boolean
  ) {
    this.ctx = canvas.getContext('2d');

    if (this.ctx) {
      canvas.width = FilmGrain.BUFFER_WIDTH;
      canvas.height = FilmGrain.BUFFER_HEIGHT;
      this.imageData = this.ctx.createImageData(FilmGrain.BUFFER_WIDTH, FilmGrain.BUFFER_HEIGHT);
    } else {
      this.imageData = null;
    }
  }

  start(): void {
    if (!this.ctx) return;

    this.draw();

    if (!this.reduced) this.timer = setInterval(() => this.draw(), FilmGrain.REDRAW_INTERVAL_MS);
  }

  setIntensity(level: number): void {
    this.canvas.style.opacity = String(level);
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private draw(): void {
    if (!this.ctx || !this.imageData) return;

    const data = this.imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const v = (110 + Math.random() * 145) | 0;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }
}
