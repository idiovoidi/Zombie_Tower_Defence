import type { Container } from 'pixi.js';
import { UI_COLORS } from '../config/uiTheme';
import { UI_DIMENSIONS } from '../config/visualConstants';
import { MetalUI } from './theme/MetalUI';
import { UIComponent } from './UIComponent';
import { bannerPose, type WaveAnnouncement } from './waveAnnouncement';

const BANNER_WIDTH = 460;
const BANNER_HEIGHT = 64;
/** Resting Y of the banner's top edge, and how far above it starts. */
const REST_Y = 96;
const SLIDE_DISTANCE = 90;

const TONE_COLORS = {
  normal: UI_COLORS.WARNING,
  elite: UI_COLORS.ALERT,
  clear: UI_COLORS.READY,
} as const;

/**
 * Transient "WAVE n" / "BOSS INBOUND" / "WAVE CLEARED" announcement shown over the play area.
 * Non-interactive: it never intercepts clicks meant for towers.
 */
export class WaveBanner extends UIComponent {
  private bar: Container | null = null;
  /** performance.now() when the banner appeared; real time, so pausing the game does not freeze it. */
  private startedAt = 0;
  private holdSec = 2;

  constructor() {
    super();
    this.eventMode = 'none';
    this.position.set(UI_DIMENSIONS.PLAY_AREA_WIDTH / 2, REST_Y);
    this.visible = false;
  }

  public announce(announcement: WaveAnnouncement): void {
    if (this.bar) {
      this.removeChild(this.bar);
      this.bar.destroy({ children: true });
    }
    this.bar = MetalUI.createTitleBar(
      BANNER_WIDTH,
      BANNER_HEIGHT,
      announcement.title,
      announcement.subtitle,
      TONE_COLORS[announcement.tone],
      { fontSize: 13, fill: UI_COLORS.TEXT }
    );
    this.bar.position.set(-BANNER_WIDTH / 2, 0);
    this.addChild(this.bar);

    // Elite warnings linger so they are not missed
    this.holdSec = announcement.tone === 'elite' ? 3 : 2;
    this.startedAt = performance.now();
    this.visible = true;
    this.applyPose();
  }

  /** Hide immediately (game over, victory, leaving the level). */
  public dismiss(): void {
    this.visible = false;
  }

  /** Driven by wall-clock time (the UI loop's delta is scaled by game speed and is 0 while paused). */
  public update(_deltaTime: number): void {
    if (!this.visible) {
      return;
    }
    this.applyPose();
  }

  private applyPose(): void {
    const pose = bannerPose((performance.now() - this.startedAt) / 1000, this.holdSec);
    if (pose.done) {
      this.visible = false;
      return;
    }
    this.alpha = pose.alpha;
    this.y = REST_Y - (1 - pose.slide) * SLIDE_DISTANCE;
  }
}
