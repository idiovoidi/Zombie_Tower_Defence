import { Graphics, Text } from 'pixi.js';
import { GameConfig } from '../config/gameConfig';
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
import { UIComponent } from './UIComponent';

type EditorTab = 'path' | 'waves';

interface ButtonHandle {
  bg: Graphics;
  label: Text;
}

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
  private panelBg: Graphics;

  private titleText: Text;
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
    this.panelBg = new Graphics();

    this.titleText = new Text({
      text: 'MAP CREATOR',
      style: { fontFamily: 'Arial', fontSize: 28, fontWeight: 'bold', fill: 0xffffff },
    });
    this.statusText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xffcc66,
        wordWrap: true,
        wordWrapWidth: 240,
      },
    });
    this.metaText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xdddddd,
        wordWrap: true,
        wordWrapWidth: 240,
      },
    });
    this.waveInfoText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 13,
        fill: 0xeeeeee,
        wordWrap: true,
        wordWrapWidth: 240,
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
    const panelX = playW + 8;

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

    this.panelBg.roundRect(panelX, 0, GameConfig.UI_SHOP_WIDTH - 16, playH, 8).fill(0x1a1a1a);
    this.addChild(this.panelBg);

    this.titleText.position.set(panelX + 12, 12);
    this.addChild(this.titleText);

    this.metaText.position.set(panelX + 12, 48);
    this.addChild(this.metaText);

    this.waveInfoText.position.set(panelX + 12, 280);
    this.addChild(this.waveInfoText);

    this.statusText.position.set(panelX + 12, playH - 90);
    this.addChild(this.statusText);

    const btnW = 108;
    const btnH = 32;
    const left = panelX + 12;
    let y = 120;

    this.addButton(left, y, btnW, btnH, 'Path', 0x445566, () => {
      this.tab = 'path';
      this.refreshView();
    });
    this.addButton(left + btnW + 8, y, btnW, btnH, 'Waves', 0x445566, () => {
      this.tab = 'waves';
      this.refreshView();
    });
    y += 40;

    this.addButton(left, y, btnW, btnH, 'Undo Pt', 0x666633, () => {
      this.doc.map.waypoints = removeLastWaypoint(this.doc.map.waypoints);
      this.statusMessage = 'Removed last waypoint';
      this.refreshView();
    });
    this.addButton(left + btnW + 8, y, btnW, btnH, 'Clear Path', 0x663333, () => {
      this.doc.map.waypoints = [];
      this.statusMessage = 'Path cleared';
      this.refreshView();
    });
    y += 40;

    this.addButton(left, y, btnW, btnH, 'Rename', 0x335566, () => {
      const name = window.prompt('Map name', this.doc.name);
      if (name?.trim()) {
        this.doc.name = name.trim();
        this.refreshView();
      }
    });
    this.addButton(left + btnW + 8, y, btnW, btnH, 'Money ±', 0x335566, () => {
      const raw = window.prompt('Starting money', String(this.doc.level.startingMoney));
      if (raw !== null) {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 0) {
          this.doc.level.startingMoney = Math.floor(n);
          this.refreshView();
        }
      }
    });
    y += 40;

    this.addButton(left, y, btnW, btnH, 'Lives ±', 0x335566, () => {
      const raw = window.prompt('Starting lives', String(this.doc.level.startingLives));
      if (raw !== null) {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 1) {
          this.doc.level.startingLives = Math.floor(n);
          this.refreshView();
        }
      }
    });
    this.addButton(left + btnW + 8, y, btnW, btnH, 'Difficulty', 0x335566, () => {
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
    y = 250;
    this.addButton(left, y, 50, btnH, 'W-', 0x444466, () => {
      this.selectedWave = Math.max(1, this.selectedWave - 1);
      this.refreshView();
    });
    this.addButton(left + 56, y, 50, btnH, 'W+', 0x444466, () => {
      this.selectedWave += 1;
      this.refreshView();
    });
    this.addButton(left + 112, y, 100, btnH, 'Copy Def', 0x446644, () => {
      this.copyDefaultWave();
    });

    y = 430;
    this.addButton(left, y, btnW, btnH, 'Add Group', 0x446644, () => {
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
    this.addButton(left + btnW + 8, y, btnW, btnH, 'Del Group', 0x664444, () => {
      const entry = this.getSelectedWaveEntry();
      if (entry && entry.groups.length > 0) {
        entry.groups.pop();
        if (entry.groups.length === 0) {
          this.doc.waves = this.doc.waves.filter(w => w.wave !== this.selectedWave);
        }
        this.refreshView();
      }
    });

    y = 470;
    this.addButton(left, y, btnW, btnH, 'Cycle Type', 0x555577, () => {
      const entry = this.getSelectedWaveEntry();
      const group = entry?.groups[entry.groups.length - 1];
      if (group) {
        const idx = this.zombieTypes.indexOf(group.type);
        group.type = this.zombieTypes[(idx + 1) % this.zombieTypes.length];
        this.refreshView();
      }
    });
    this.addButton(left + btnW + 8, y, btnW, btnH, 'Count +5', 0x555577, () => {
      const entry = this.getSelectedWaveEntry();
      const group = entry?.groups[entry.groups.length - 1];
      if (group) {
        group.count += 5;
        this.refreshView();
      }
    });

    y = 510;
    this.addButton(left, y, btnW, btnH, 'Count -1', 0x555577, () => {
      const entry = this.getSelectedWaveEntry();
      const group = entry?.groups[entry.groups.length - 1];
      if (group) {
        group.count = Math.max(1, group.count - 1);
        this.refreshView();
      }
    });
    this.addButton(left + btnW + 8, y, btnW, btnH, 'Interval', 0x555577, () => {
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

    y = 560;
    this.addButton(left, y, btnW, btnH, 'Save', 0x228822, () => this.saveDoc());
    this.addButton(left + btnW + 8, y, btnW, btnH, 'Export', 0x226688, () => this.exportDoc());
    y += 40;
    this.addButton(left, y, btnW, btnH, 'Import', 0x886622, () => {
      this.importDoc().catch(err => {
        this.statusMessage = err instanceof Error ? err.message : 'Import failed';
        this.refreshView();
      });
    });
    this.addButton(left + btnW + 8, y, btnW, btnH, 'Play', 0x22aa44, () => this.playDoc());
    y += 40;
    this.addButton(left, y, btnW * 2 + 8, btnH, 'Back', 0xaa2222, () => {
      this.onBackCallback?.();
    });
  }

  private addButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    color: number,
    onClick: () => void
  ): ButtonHandle {
    const bg = new Graphics();
    bg.roundRect(0, 0, w, h, 6).fill(color);
    bg.position.set(x, y);
    bg.eventMode = 'static';
    bg.cursor = 'pointer';
    bg.on('pointerdown', e => {
      e.stopPropagation();
      onClick();
    });
    this.addChild(bg);

    const text = new Text({
      text: label,
      style: { fontFamily: 'Arial', fontSize: 13, fill: 0xffffff, align: 'center' },
    });
    text.anchor.set(0.5);
    text.position.set(x + w / 2, y + h / 2);
    this.addChild(text);

    return { bg, label: text };
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
      this.pathGfx.setStrokeStyle({ width: PATH.WIDTH, color: 0x6a5a4a, alpha: 0.9 });
      this.pathGfx.moveTo(wps[0].x, wps[0].y);
      for (let i = 1; i < wps.length; i++) {
        this.pathGfx.lineTo(wps[i].x, wps[i].y);
      }
      this.pathGfx.stroke();
    }

    wps.forEach((wp, i) => {
      const color = i === 0 ? 0x44ff44 : i === wps.length - 1 ? 0xff4444 : 0xffdd44;
      this.waypointGfx.circle(wp.x, wp.y, 6).fill(color);
    });
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

  private refreshView(): void {
    this.drawGrid();
    this.drawPath();

    this.metaText.text = [
      `Name: ${this.doc.name}`,
      `Points: ${this.doc.map.waypoints.length}`,
      `Money: ${this.doc.level.startingMoney}  Lives: ${this.doc.level.startingLives}`,
      `Difficulty: ${this.doc.level.difficulty}`,
      `Tab: ${this.tab.toUpperCase()}`,
    ].join('\n');

    const entry = this.getSelectedWaveEntry();
    const groupLines = entry?.groups.map(
      (g, i) => `  ${i + 1}. ${g.type} x${g.count} @${g.spawnInterval}s`
    ) ?? ['  (using built-in default)'];
    this.waveInfoText.text = [`Wave ${this.selectedWave}`, ...groupLines].join('\n');

    this.statusText.text = this.statusMessage;
  }

  private saveDoc(): void {
    const result = validateCustomMap(this.doc);
    if (!result.valid) {
      this.statusMessage = `Fix: ${result.errors[0]}`;
      this.refreshView();
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
    const result = validateCustomMap(this.doc);
    if (!result.valid) {
      this.statusMessage = `Fix: ${result.errors[0]}`;
      this.refreshView();
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
    const result = validateCustomMap(this.doc);
    if (!result.valid) {
      this.statusMessage = `Fix: ${result.errors[0]}`;
      this.refreshView();
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
