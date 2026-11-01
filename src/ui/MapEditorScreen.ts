import { type Container, Graphics, Text } from 'pixi.js';
import { GameConfig } from '../config/gameConfig';
import { UI_COLORS, UI_FONTS } from '../config/uiTheme';
import { PATH, UI_DIMENSIONS } from '../config/visualConstants';
import {
  appendSnappedWaypoint,
  type CustomMapDocument,
  type CustomWaveOverride,
  createEmptyCustomMapDocument,
  customMapStore,
  removeLastWaypoint,
  validateCustomMap,
} from '../customMaps';
import { pickJsonFileText } from '../customMaps/pickJsonFile';
import type { ZombieGroup } from '../managers/WaveManager';
import { type MetalButtonVariant, MetalUI } from './theme/MetalUI';
import { UIComponent } from './UIComponent';

type EditorTab = 'path' | 'waves';

/** Sidebar column beside the 1024px playfield (matches the in-game shop column). */
const SIDEBAR_WIDTH = 256;
const SIDEBAR_PADDING = 12;
const SIDEBAR_INNER_WIDTH = SIDEBAR_WIDTH - SIDEBAR_PADDING * 2;

/**
 * Functional custom map creator: grid-snap path editing, wave overrides, save/export/import/play.
 */
export class MapEditorScreen extends UIComponent {
  private doc: CustomMapDocument;
  private tab: EditorTab = 'path';
  private selectedWave = 1;
  private statusMessage = '';

  private playArea: Graphics;
  private gridGfx: Graphics;
  private pathGfx: Graphics;
  private waypointGfx: Graphics;
  private tabMarker: Graphics;
  /** Buttons that belong to a single tab; the other tab's controls are hidden. */
  private pathControls: Container[] = [];
  private waveControls: Container[] = [];

  private statusText: Text;
  private metaText: Text;
  private waveInfoText: Text;

  private onBackCallback: (() => void) | null = null;
  private onPlayCallback: ((doc: CustomMapDocument) => void) | null = null;
  private onGetDefaultWave: ((wave: number) => ZombieGroup[]) | null = null;

  private readonly zombieTypes: string[];

  constructor() {
    super();
    this.zombieTypes = Object.values(GameConfig.ZOMBIE_TYPES);
    this.doc = createEmptyCustomMapDocument();

    this.playArea = new Graphics();
    this.gridGfx = new Graphics();
    this.pathGfx = new Graphics();
    this.waypointGfx = new Graphics();
    this.tabMarker = new Graphics();

    this.statusText = new Text({
      text: '',
      style: {
        fontFamily: UI_FONTS.BODY,
        fontSize: 13,
        fill: UI_COLORS.WARNING,
        wordWrap: true,
        wordWrapWidth: SIDEBAR_INNER_WIDTH,
      },
    });
    this.metaText = new Text({
      text: '',
      style: {
        fontFamily: UI_FONTS.MONO,
        fontSize: 12,
        fontWeight: 'bold',
        fill: UI_COLORS.TEXT_DIM,
        lineHeight: 17,
      },
    });
    this.waveInfoText = new Text({
      text: '',
      style: {
        fontFamily: UI_FONTS.MONO,
        fontSize: 12,
        fill: UI_COLORS.TEXT,
        wordWrap: true,
        wordWrapWidth: SIDEBAR_INNER_WIDTH,
        lineHeight: 17,
      },
    });

    this.buildLayout();
    this.refreshView();
  }

  public loadDocument(doc: CustomMapDocument): void {
    this.doc = {
      ...doc,
      map: {
        ...doc.map,
        waypoints: doc.map.waypoints.map(wp => ({ ...wp })),
      },
      level: { ...doc.level },
      waves: doc.waves.map(w => ({
        wave: w.wave,
        groups: w.groups.map(g => ({ ...g })),
      })),
    };
    this.selectedWave = this.doc.waves[0]?.wave ?? 1;
    this.statusMessage = `Loaded "${this.doc.name}"`;
    this.refreshView();
  }

  public newDocument(): void {
    this.doc = createEmptyCustomMapDocument();
    this.selectedWave = 1;
    this.tab = 'path';
    this.statusMessage = 'New map — click the grid to place path points (start near the left edge)';
    this.refreshView();
  }

  public getDocument(): CustomMapDocument {
    return this.doc;
  }

  public setBackCallback(cb: () => void): void {
    this.onBackCallback = cb;
  }

  public setPlayCallback(cb: (doc: CustomMapDocument) => void): void {
    this.onPlayCallback = cb;
  }

  public setDefaultWaveProvider(cb: (wave: number) => ZombieGroup[]): void {
    this.onGetDefaultWave = cb;
  }

  public update(_deltaTime: number): void {
    // Static editor UI
  }

  private buildLayout(): void {
    const playW = UI_DIMENSIONS.PLAY_AREA_WIDTH;
    const playH = UI_DIMENSIONS.HEIGHT;
    const panelX = playW;

    this.playArea.rect(0, 0, playW, playH).fill(0x2a2a22);
    this.playArea.eventMode = 'static';
    this.playArea.cursor = 'crosshair';
    this.playArea.on('pointerdown', e => {
      if (this.tab !== 'path') {
        return;
      }
      const local = e.getLocalPosition(this.playArea);
      this.doc.map.waypoints = appendSnappedWaypoint(
        this.doc.map.waypoints,
        local.x,
        local.y,
        this.doc.map.cellSize,
        { width: this.doc.map.width, height: this.doc.map.height }
      );
      this.statusMessage = `Waypoint ${this.doc.map.waypoints.length} placed`;
      this.refreshView();
    });
    this.addChild(this.playArea);
    this.addChild(this.gridGfx);
    this.addChild(this.pathGfx);
    this.addChild(this.waypointGfx);

    const plate = MetalUI.createSidePlate(SIDEBAR_WIDTH, playH);
    plate.position.set(panelX, 0);
    this.addChild(plate);

    const left = panelX + SIDEBAR_PADDING;

    const titleBar = MetalUI.createTitleBar(
      SIDEBAR_INNER_WIDTH,
      46,
      'MAP CREATOR',
      'DESIGN YOUR BATTLEFIELD',
      UI_COLORS.WARNING,
      { fontSize: 10, fill: UI_COLORS.TEXT }
    );
    titleBar.position.set(left, 14);
    this.addChild(titleBar);

    this.metaText.position.set(left, 70);
    this.addChild(this.metaText);

    this.waveInfoText.position.set(left, 246);
    this.addChild(this.waveInfoText);

    this.statusText.position.set(left, playH - 92);
    this.addChild(this.statusText);

    this.addChild(this.tabMarker);

    const btnW = 112;
    const btnH = 30;
    const col2 = left + btnW + 8;

    this.addButton(left, 156, btnW, btnH, 'Path', 'neutral', () => {
      this.tab = 'path';
      this.refreshView();
    });
    this.addButton(col2, 156, btnW, btnH, 'Waves', 'neutral', () => {
      this.tab = 'waves';
      this.refreshView();
    });

    this.addPathButton(left, 200, btnW, btnH, 'Undo Pt', 'neutral', () => {
      this.doc.map.waypoints = removeLastWaypoint(this.doc.map.waypoints);
      this.statusMessage = 'Removed last waypoint';
      this.refreshView();
    });
    this.addPathButton(col2, 200, btnW, btnH, 'Clear Path', 'danger', () => {
      this.doc.map.waypoints = [];
      this.statusMessage = 'Path cleared';
      this.refreshView();
    });

    this.addPathButton(left, 240, btnW, btnH, 'Rename', 'neutral', () => {
      const name = window.prompt('Map name', this.doc.name);
      if (name?.trim()) {
        this.doc.name = name.trim();
        this.refreshView();
      }
    });
    this.addPathButton(col2, 240, btnW, btnH, 'Money ±', 'neutral', () => {
      const raw = window.prompt('Starting money', String(this.doc.level.startingMoney));
      if (raw !== null) {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 0) {
          this.doc.level.startingMoney = Math.floor(n);
          this.refreshView();
        }
      }
    });

    this.addPathButton(left, 280, btnW, btnH, 'Lives ±', 'neutral', () => {
      const raw = window.prompt('Starting lives', String(this.doc.level.startingLives));
      if (raw !== null) {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 1) {
          this.doc.level.startingLives = Math.floor(n);
          this.refreshView();
        }
      }
    });
    this.addPathButton(col2, 280, btnW, btnH, 'Difficulty', 'neutral', () => {
      const order: CustomMapDocument['level']['difficulty'][] = [
        'Easy',
        'Normal',
        'Hard',
        'Nightmare',
      ];
      const idx = order.indexOf(this.doc.level.difficulty);
      this.doc.level.difficulty = order[(idx + 1) % order.length];
      this.refreshView();
    });

    // Wave controls (always present; meaningful on Waves tab)
    this.addWaveButton(left, 200, 40, btnH, 'W-', 'neutral', () => {
      this.selectedWave = Math.max(1, this.selectedWave - 1);
      this.refreshView();
    });
    this.addWaveButton(left + 44, 200, 40, btnH, 'W+', 'neutral', () => {
      this.selectedWave += 1;
      this.refreshView();
    });
    this.addWaveButton(left + 88, 200, 144, btnH, 'Copy Def', 'ready', () => {
      this.copyDefaultWave();
    });

    this.addWaveButton(left, 392, btnW, btnH, 'Add Group', 'ready', () => {
      this.ensureWaveEntry();
      const entry = this.getSelectedWaveEntry();
      if (entry) {
        entry.groups.push({
          type: GameConfig.ZOMBIE_TYPES.BASIC,
          count: 5,
          spawnInterval: 2,
        });
        this.refreshView();
      }
    });
    this.addWaveButton(col2, 392, btnW, btnH, 'Del Group', 'danger', () => {
      const entry = this.getSelectedWaveEntry();
      if (entry && entry.groups.length > 0) {
        entry.groups.pop();
        if (entry.groups.length === 0) {
          this.doc.waves = this.doc.waves.filter(w => w.wave !== this.selectedWave);
        }
        this.refreshView();
      }
    });

    this.addWaveButton(left, 430, btnW, btnH, 'Cycle Type', 'neutral', () => {
      const entry = this.getSelectedWaveEntry();
      const group = entry?.groups[entry.groups.length - 1];
      if (group) {
        const idx = this.zombieTypes.indexOf(group.type);
        group.type = this.zombieTypes[(idx + 1) % this.zombieTypes.length];
        this.refreshView();
      }
    });
    this.addWaveButton(col2, 430, btnW, btnH, 'Count +5', 'neutral', () => {
      const entry = this.getSelectedWaveEntry();
      const group = entry?.groups[entry.groups.length - 1];
      if (group) {
        group.count += 5;
        this.refreshView();
      }
    });

    this.addWaveButton(left, 468, btnW, btnH, 'Count -1', 'neutral', () => {
      const entry = this.getSelectedWaveEntry();
      const group = entry?.groups[entry.groups.length - 1];
      if (group) {
        group.count = Math.max(1, group.count - 1);
        this.refreshView();
      }
    });
    this.addWaveButton(col2, 468, btnW, btnH, 'Interval', 'neutral', () => {
      const entry = this.getSelectedWaveEntry();
      const group = entry?.groups[entry.groups.length - 1];
      if (group) {
        const raw = window.prompt('Spawn interval (seconds)', String(group.spawnInterval));
        if (raw !== null) {
          const n = Number(raw);
          if (Number.isFinite(n) && n > 0) {
            group.spawnInterval = n;
            this.refreshView();
          }
        }
      }
    });

    this.addButton(left, 552, btnW, btnH, 'Save', 'ready', () => this.saveDoc());
    this.addButton(col2, 552, btnW, btnH, 'Export', 'neutral', () => this.exportDoc());
    this.addButton(left, 590, btnW, btnH, 'Import', 'neutral', () => {
      this.importDoc().catch(err => {
        this.statusMessage = err instanceof Error ? err.message : 'Import failed';
        this.refreshView();
      });
    });
    this.addButton(col2, 590, btnW, btnH, 'Play', 'ready', () => this.playDoc());
    this.addButton(left, 628, SIDEBAR_INNER_WIDTH, btnH, 'Back', 'danger', () => {
      this.onBackCallback?.();
    });
  }

  private addButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    variant: MetalButtonVariant,
    onClick: () => void
  ): Container {
    const button = MetalUI.createMetalButton({
      label: label.toUpperCase(),
      variant,
      width: w,
      height: h,
      fontSize: 12,
      onClick,
    });
    button.position.set(x, y);
    this.addChild(button);
    return button;
  }

  private addPathButton(...args: Parameters<MapEditorScreen['addButton']>): void {
    this.pathControls.push(this.addButton(...args));
  }

  private addWaveButton(...args: Parameters<MapEditorScreen['addButton']>): void {
    this.waveControls.push(this.addButton(...args));
  }

  private drawGrid(): void {
    this.gridGfx.clear();
    const { width, height, cellSize } = this.doc.map;
    this.gridGfx.setStrokeStyle({ width: 1, color: 0x3a3a32, alpha: 0.5 });
    for (let x = 0; x <= width; x += cellSize) {
      this.gridGfx.moveTo(x, 0);
      this.gridGfx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += cellSize) {
      this.gridGfx.moveTo(0, y);
      this.gridGfx.lineTo(width, y);
    }
    this.gridGfx.stroke();

    // Spawn band hint
    this.gridGfx.rect(0, 0, 96, height).fill({ color: 0x224422, alpha: 0.15 });
  }

  private drawPath(): void {
    this.pathGfx.clear();
    this.waypointGfx.clear();
    const wps = this.doc.map.waypoints;
    if (wps.length === 0) {
      return;
    }

    if (wps.length >= 2) {
      // Road: dark border, dirt surface, then a dashed centre line and direction chevrons
      const trace = (g: Graphics): void => {
        g.moveTo(wps[0].x, wps[0].y);
        for (let i = 1; i < wps.length; i++) {
          g.lineTo(wps[i].x, wps[i].y);
        }
      };
      trace(this.pathGfx);
      this.pathGfx.stroke({ width: PATH.WIDTH + 8, color: 0x2a2018, join: 'round', cap: 'round' });
      trace(this.pathGfx);
      this.pathGfx.stroke({ width: PATH.WIDTH, color: 0x6a5a4a, join: 'round', cap: 'round' });
      this.drawPathGuides(wps);
    }

    wps.forEach((wp, i) => {
      const isStart = i === 0;
      const isEnd = i === wps.length - 1 && wps.length > 1;
      const color = isStart ? 0x44ff44 : isEnd ? 0xff4444 : 0xffdd44;
      const radius = isStart || isEnd ? 9 : 6;
      this.waypointGfx.circle(wp.x, wp.y, radius + 2).fill({ color: 0x000000, alpha: 0.6 });
      this.waypointGfx.circle(wp.x, wp.y, radius).fill(color);
      this.waypointGfx
        .circle(wp.x, wp.y, radius)
        .stroke({ width: 2, color: 0xffffff, alpha: 0.85 });
    });
  }

  /** Dashed centre line plus a chevron at each segment midpoint showing travel direction. */
  private drawPathGuides(wps: { x: number; y: number }[]): void {
    const dash = 14;
    const gap = 10;
    for (let i = 0; i < wps.length - 1; i++) {
      const { x: x0, y: y0 } = wps[i];
      const { x: x1, y: y1 } = wps[i + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (len < 1) {
        continue;
      }
      const ux = (x1 - x0) / len;
      const uy = (y1 - y0) / len;

      for (let d = 0; d < len; d += dash + gap) {
        const end = Math.min(d + dash, len);
        this.pathGfx.moveTo(x0 + ux * d, y0 + uy * d).lineTo(x0 + ux * end, y0 + uy * end);
      }
      this.pathGfx.stroke({ width: 2, color: 0xffee88, alpha: 0.55 });

      if (len >= 48) {
        const mx = x0 + (x1 - x0) / 2;
        const my = y0 + (y1 - y0) / 2;
        const px = -uy;
        const py = ux;
        const size = 8;
        this.pathGfx
          .moveTo(mx - ux * size + px * size, my - uy * size + py * size)
          .lineTo(mx + ux * size, my + uy * size)
          .lineTo(mx - ux * size - px * size, my - uy * size - py * size)
          .stroke({ width: 3, color: 0xffee88, alpha: 0.8, join: 'round', cap: 'round' });
      }
    }
  }

  private getSelectedWaveEntry(): CustomWaveOverride | undefined {
    return this.doc.waves.find(w => w.wave === this.selectedWave);
  }

  private ensureWaveEntry(): CustomWaveOverride {
    let entry = this.getSelectedWaveEntry();
    if (!entry) {
      entry = { wave: this.selectedWave, groups: [] };
      this.doc.waves.push(entry);
      this.doc.waves.sort((a, b) => a.wave - b.wave);
    }
    return entry;
  }

  private copyDefaultWave(): void {
    if (!this.onGetDefaultWave) {
      this.statusMessage = 'Default wave data unavailable';
      this.refreshView();
      return;
    }
    const groups = this.onGetDefaultWave(this.selectedWave);
    if (groups.length === 0) {
      this.statusMessage = `No default composition for wave ${this.selectedWave}`;
      this.refreshView();
      return;
    }
    const entry = this.ensureWaveEntry();
    entry.groups = groups.map(g => ({ ...g }));
    this.statusMessage = `Copied default wave ${this.selectedWave}`;
    this.refreshView();
  }

  /** Show only the active tab's controls and underline the active tab button. */
  private applyTabState(): void {
    const onPath = this.tab === 'path';
    for (const control of this.pathControls) {
      control.visible = onPath;
    }
    for (const control of this.waveControls) {
      control.visible = !onPath;
    }

    const left = UI_DIMENSIONS.PLAY_AREA_WIDTH + SIDEBAR_PADDING;
    const buttonW = 112;
    const markerX = onPath ? left : left + buttonW + 8;
    this.tabMarker
      .clear()
      .rect(markerX, 156 + 30 + 3, buttonW, 4)
      .fill(UI_COLORS.WARNING);
  }

  private refreshView(): void {
    this.drawGrid();
    this.drawPath();

    this.metaText.text = [
      `NAME   ${this.doc.name}`,
      `POINTS ${this.doc.map.waypoints.length}`,
      `FUNDS  $${this.doc.level.startingMoney}`,
      `LIVES  ${this.doc.level.startingLives}`,
      `LEVEL  ${this.doc.level.difficulty.toUpperCase()}`,
    ].join('\n');

    this.applyTabState();

    const entry = this.getSelectedWaveEntry();
    const groupLines = entry?.groups.map(
      (g, i) => `  ${i + 1}. ${g.type} x${g.count} @${g.spawnInterval}s`
    ) ?? ['  (using built-in default)'];
    this.waveInfoText.text = [`WAVE ${this.selectedWave}`, ...groupLines].join('\n');
    this.waveInfoText.visible = this.tab === 'waves';

    this.statusText.text = this.statusMessage;
  }

  /** Validate the working document; on failure show the first error and return false. */
  private validateOrReport(): boolean {
    const result = validateCustomMap(this.doc);
    if (result.valid) {
      return true;
    }
    this.statusMessage = `Fix: ${result.errors[0]}`;
    this.refreshView();
    return false;
  }

  private saveDoc(): void {
    if (!this.validateOrReport()) {
      return;
    }
    try {
      this.doc = customMapStore.save(this.doc);
      this.statusMessage = 'Saved locally';
    } catch (err) {
      this.statusMessage = err instanceof Error ? err.message : 'Save failed';
    }
    this.refreshView();
  }

  private exportDoc(): void {
    if (!this.validateOrReport()) {
      return;
    }
    try {
      customMapStore.exportToFile(this.doc);
      this.statusMessage = 'JSON downloaded';
    } catch (err) {
      this.statusMessage = err instanceof Error ? err.message : 'Export failed';
    }
    this.refreshView();
  }

  private async importDoc(): Promise<void> {
    try {
      const imported = await this.pickAndImport();
      if (imported) {
        this.loadDocument(imported);
        this.statusMessage = `Imported "${imported.name}"`;
      }
    } catch (err) {
      this.statusMessage = err instanceof Error ? err.message : 'Import failed';
      this.refreshView();
    }
  }

  private async pickAndImport(): Promise<CustomMapDocument | null> {
    const text = await pickJsonFileText();
    return text === null ? null : customMapStore.importFromJson(text, { newId: true });
  }

  private playDoc(): void {
    if (!this.validateOrReport()) {
      return;
    }
    try {
      this.doc = customMapStore.save(this.doc);
    } catch {
      // Play without save if storage unavailable
    }
    this.onPlayCallback?.(this.doc);
  }
}
