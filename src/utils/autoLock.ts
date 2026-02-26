export class AutoLockManager {
  private timeout: number;
  private timerId: number | null = null;
  private lastActivity: number = Date.now();
  private onLockCallback: (() => void) | null = null;

  constructor(timeoutMinutes: number = 15) {
    this.timeout = timeoutMinutes * 60 * 1000;
    this.setupActivityListeners();
  }

  private setupActivityListeners(): void {
    const resetTimer = () => {
      this.lastActivity = Date.now();
      this.resetTimer();
    };

    ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });
  }

  public start(onLock: () => void): void {
    this.onLockCallback = onLock;
    this.resetTimer();
  }

  public stop(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private resetTimer(): void {
    this.stop();

    this.timerId = window.setTimeout(() => {
      if (this.onLockCallback) {
        this.onLockCallback();
      }
    }, this.timeout);
  }

  public getTimeRemaining(): number {
    const elapsed = Date.now() - this.lastActivity;
    const remaining = this.timeout - elapsed;
    return Math.max(0, remaining);
  }

  public setTimeout(minutes: number): void {
    this.timeout = minutes * 60 * 1000;
    this.resetTimer();
  }

  public destroy(): void {
    this.stop();
    this.onLockCallback = null;
  }
}

export function formatTimeRemaining(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
