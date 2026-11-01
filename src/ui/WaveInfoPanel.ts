import { Container, Graphics, Text } from 'pixi.js';
import { GameConfig } from '../config/gameConfig';
import { WaveManager, type ZombieGroup } from '../managers/WaveManager';
import { UIPanel } from './UIPanel';

interface ZombieMeta {
  color: number;
  short: string;
}

const ZOMBIE_META: Record<string, ZombieMeta> = {
  [GameConfig.ZOMBIE_TYPES.BASIC]: { color: 0x4caf50, short: 'BAS' },
  [GameConfig.ZOMBIE_TYPES.FAST]: { color: 0xff8a3d, short: 'FST' },
  [GameConfig.ZOMBIE_TYPES.TANK]: { color: 0xe53935, short: 'TNK' },
  [GameConfig.ZOMBIE_TYPES.ARMORED]: { color: 0x9e9e9e, short: 'ARM' },
  [GameConfig.ZOMBIE_TYPES.SWARM]: { color: 0xcddc39, short: 'SWM' },
  [GameConfig.ZOMBIE_TYPES.STEALTH]: { color: 0x9c27b0, short: 'STL' },
  [GameConfig.ZOMBIE_TYPES.MECHANICAL]: { color: 0x00bcd4, short: 'MCH' },
  [GameConfig.ZOMBIE_TYPES.BOSS]: { color: 0xffaa00, short: 'BOS' },
  [GameConfig.ZOMBIE_TYPES.NECRO_TANK]: { color: 0xaa66ff, short: 'NCR' },
};

const PANEL_W = 540;
const PANEL_H = 760;
const CARD_W = 510;
const WAVES_VISIBLE = 3;
const ACCENT = 0xffcc00;

/**
 * Debug panel showing upcoming wave composition with visual bars and navigation.
 */
export class WaveInfoPanel extends UIPanel {
  private waveManager: WaveManager | null = null;
  private currentWave = 1;
  /** First wave shown in the preview window (can browse ahead/behind). */
  private previewStartWave = 1;
  private dynamicRoot: Container | null = null;
  private panelWidth = PANEL_W;

  constructor() {
    super();
    this.cullableChildren = false;
    this.createPanelFrame(
      PANEL_W,
      PANEL_H,
      'WAVE INTEL',
      'Composition · spawn rates · difficulty',
      ACCENT
    );
    this.panelWidth = PANEL_W;
  }

  public setWaveManager(waveManager: WaveManager): void {
    this.waveManager = waveManager;
    this.previewStartWave = waveManager.getCurrentWave();
    this.updateWaveInfo();
  }

  protected override onOpen(): void {
    this.previewStartWave = this.currentWave;
    this.updateWaveInfo();
  }

  public updateCurrentWave(wave: number): void {
    const wasTrackingLive = this.previewStartWave === this.currentWave;
    this.currentWave = wave;
    if (wasTrackingLive || !this.isExpanded) {
      this.previewStartWave = wave;
    }
    if (this.isExpanded) {
      this.updateWaveInfo();
    }
  }

  private clearDynamic(): void {
    if (this.dynamicRoot) {
      this.contentContainer.removeChild(this.dynamicRoot);
      this.dynamicRoot.destroy({ children: true });
      this.dynamicRoot = null;
    }
  }

  private updateWaveInfo(): void {
    if (!this.waveManager) {
      return;
    }

    this.clearDynamic();
    this.dynamicRoot = new Container();
    this.contentContainer.addChild(this.dynamicRoot);

    const pad = 15;
    let y = 58;

    // Difficulty + nav row
    y = this.buildHeaderRow(y, pad);
    y += 8;

    // Wave cards
    for (let i = 0; i < WAVES_VISIBLE; i++) {
      const waveNum = this.previewStartWave + i;
      const groups = this.waveManager.getZombiesForWave(waveNum);
      if (groups.length === 0) {
        continue;
      }
      const cardH = this.buildWaveCard(waveNum, groups, pad, y);
      y += cardH + 10;
    }

    // Legend
    this.buildLegend(y + 4, pad);
  }

  private buildHeaderRow(y: number, pad: number): number {
    const row = new Container();
    row.position.set(pad, y);

    const diff = this.waveManager?.getDifficultyModifier() ?? 1;
    const diffPct = Math.round(diff * 100);
    const diffColor = diff > 1.05 ? 0xff6b6b : diff < 0.95 ? 0x69f0ae : 0xb0bec5;

    const status = new Text({
      text: `Live wave ${this.currentWave}  ·  Difficulty ${diffPct}%`,
      style: {
        fontFamily: 'Courier New, monospace',
        fontSize: 11,
        fill: diffColor,
      },
    });
    row.addChild(status);

    const navY = 22;
    const btnW = 72;
    const btnH = 26;
    const gap = 8;

    const prevBtn = this.createActionButton('◀ Prev', btnW, btnH, ACCENT, () => {
      this.previewStartWave = Math.max(1, this.previewStartWave - 1);
      this.updateWaveInfo();
    });
    prevBtn.position.set(0, navY);
    row.addChild(prevBtn);

    const liveBtn = this.createActionButton('● Live', btnW, btnH, 0x69f0ae, () => {
      this.previewStartWave = this.currentWave;
      this.updateWaveInfo();
    });
    liveBtn.position.set(btnW + gap, navY);
    row.addChild(liveBtn);

    const nextBtn = this.createActionButton('Next ▶', btnW, btnH, ACCENT, () => {
      this.previewStartWave = Math.min(98, this.previewStartWave + 1);
      this.updateWaveInfo();
    });
    nextBtn.position.set((btnW + gap) * 2, navY);
    row.addChild(nextBtn);

    const jumpBtn = this.createActionButton('+5', 44, btnH, 0xff8a3d, () => {
      this.previewStartWave = Math.min(98, this.previewStartWave + 5);
      this.updateWaveInfo();
    });
    jumpBtn.position.set((btnW + gap) * 3, navY);
    row.addChild(jumpBtn);

    this.dynamicRoot?.addChild(row);
    return y + navY + btnH + 4;
  }

  private buildWaveCard(waveNum: number, groups: ZombieGroup[], pad: number, y: number): number {
    const isCurrent = waveNum === this.currentWave;
    const hasElite = groups.some(
      g =>
        g.type === GameConfig.ZOMBIE_TYPES.BOSS ||
        g.type === GameConfig.ZOMBIE_TYPES.NECRO_TANK
    );
    const hasBoss = groups.some(g => g.type === GameConfig.ZOMBIE_TYPES.BOSS);
    const hasNecro = groups.some(g => g.type === GameConfig.ZOMBIE_TYPES.NECRO_TANK);
    const borderColor = isCurrent
      ? 0x69f0ae
      : hasBoss
        ? 0xffaa00
        : hasNecro
          ? 0xaa66ff
          : 0x444444;
    const bgColor = isCurrent ? 0x1e2a1e : 0x222222;

    const entries = groups.map(group => {
      const count =
        this.waveManager?.calculateZombieCount(group.count, waveNum, group.type) ?? 0;
      const interval =
        this.waveManager?.calculateSpawnRate(group.spawnInterval, waveNum, group.type) ?? 0;
      return { type: group.type, count, interval };
    });
    const total = entries.reduce((sum, e) => sum + e.count, 0);

    // Height: header + bar + rows + padding
    const rowH = 14;
    const cardH = 34 + 12 + entries.length * rowH + 10;

    const card = new Container();
    card.position.set(pad, y);

    const bg = new Graphics();
    bg.roundRect(0, 0, CARD_W, cardH, 8).fill({ color: bgColor, alpha: 0.95 });
    bg.stroke({ width: isCurrent || hasElite ? 2 : 1, color: borderColor });
    card.addChild(bg);

    // Header
    const eliteLabel = hasBoss && hasNecro
      ? 'BOSS + NECRO'
      : hasBoss
        ? 'BOSS'
        : hasNecro
          ? 'NECRO TANK'
          : null;
    const titleLabel = isCurrent
      ? `WAVE ${waveNum}  ·  NOW`
      : eliteLabel
        ? `WAVE ${waveNum}  ·  ${eliteLabel}`
        : `WAVE ${waveNum}`;
    const title = new Text({
      text: titleLabel,
      style: {
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 13,
        fill: borderColor,
        letterSpacing: 1,
      },
    });
    title.position.set(12, 8);
    card.addChild(title);

    const totalText = new Text({
      text: `${total} zombies`,
      style: {
        fontFamily: 'Courier New, monospace',
        fontSize: 11,
        fill: 0xaaaaaa,
      },
    });
    totalText.anchor.set(1, 0);
    totalText.position.set(CARD_W - 12, 10);
    card.addChild(totalText);

    // Composition bar
    const barY = 28;
    const barX = 12;
    const barW = CARD_W - 24;
    const barH = 8;
    const barBg = new Graphics();
    barBg.roundRect(barX, barY, barW, barH, 3).fill({ color: 0x111111 });
    card.addChild(barBg);

    if (total > 0) {
      let xOff = barX;
      const bar = new Graphics();
      for (const entry of entries) {
        if (entry.count <= 0) continue;
        const segW = Math.max(2, (entry.count / total) * barW);
        const meta = this.getMeta(entry.type);
        bar.rect(xOff, barY, segW, barH).fill({ color: meta.color });
        xOff += segW;
      }
      card.addChild(bar);
    }

    // Type rows
    let rowY = barY + 14;
    for (const entry of entries) {
      if (entry.count <= 0) continue;
      const meta = this.getMeta(entry.type);
      const pct = total > 0 ? Math.round((entry.count / total) * 100) : 0;
      const isElite =
        entry.type === GameConfig.ZOMBIE_TYPES.BOSS ||
        entry.type === GameConfig.ZOMBIE_TYPES.NECRO_TANK;
      const eliteColor =
        entry.type === GameConfig.ZOMBIE_TYPES.NECRO_TANK ? 0xaa66ff : 0xffaa00;

      const swatch = new Graphics();
      swatch.roundRect(12, rowY + 3, 8, 8, 2).fill({ color: meta.color });
      card.addChild(swatch);

      const nameText = new Text({
        text: isElite ? `★ ${entry.type}` : entry.type,
        style: {
          fontFamily: 'Arial',
          fontSize: 11,
          fill: isElite ? eliteColor : 0xe0e0e0,
          fontWeight: isElite ? 'bold' : 'normal',
        },
      });
      nameText.position.set(26, rowY);
      card.addChild(nameText);

      const statsText = new Text({
        text: `${entry.count}  (${pct}%)`,
        style: {
          fontFamily: 'Courier New, monospace',
          fontSize: 11,
          fill: 0xcccccc,
        },
      });
      statsText.position.set(140, rowY);
      card.addChild(statsText);

      const rateText = new Text({
        text: `every ${entry.interval.toFixed(1)}s`,
        style: {
          fontFamily: 'Arial',
          fontSize: 10,
          fill: 0x777777,
        },
      });
      rateText.anchor.set(1, 0);
      rateText.position.set(CARD_W - 12, rowY + 1);
      card.addChild(rateText);

      rowY += rowH;
    }

    this.dynamicRoot?.addChild(card);
    return cardH;
  }

  private buildLegend(y: number, pad: number): number {
    const legend = new Container();
    legend.position.set(pad, y);

    const label = new Text({
      text: 'TYPES',
      style: {
        fontFamily: 'Impact, Arial Black, sans-serif',
        fontSize: 11,
        fill: ACCENT,
        letterSpacing: 1,
      },
    });
    legend.addChild(label);

    const types = Object.values(GameConfig.ZOMBIE_TYPES);
    const chipW = 58;
    const chipH = 20;
    let x = 0;
    let chipY = 18;
    const maxX = this.panelWidth - pad * 2;

    for (const type of types) {
      const meta = this.getMeta(type);
      if (x + chipW > maxX) {
        x = 0;
        chipY += chipH + 4;
      }

      const chip = new Container();
      chip.position.set(x, chipY);

      const bg = new Graphics();
      bg.roundRect(0, 0, chipW - 4, chipH, 4).fill({ color: 0x2a2a2a, alpha: 0.9 });
      bg.stroke({ width: 1, color: meta.color });
      chip.addChild(bg);

      const dot = new Graphics();
      dot.circle(8, chipH / 2, 3).fill({ color: meta.color });
      chip.addChild(dot);

      const t = new Text({
        text: meta.short,
        style: {
          fontFamily: 'Courier New, monospace',
          fontSize: 9,
          fill: meta.color,
          fontWeight: 'bold',
        },
      });
      t.position.set(14, 4);
      chip.addChild(t);

      legend.addChild(chip);
      x += chipW;
    }

    this.dynamicRoot?.addChild(legend);
    return y + chipY + chipH;
  }

  private getMeta(type: string): ZombieMeta {
    return ZOMBIE_META[type] ?? { color: 0xffffff, short: '???' };
  }

  public update(_deltaTime: number): void {
    // Content refreshes on open / wave change
  }
}
