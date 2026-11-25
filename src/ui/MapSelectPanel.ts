import { type Container, Text } from 'pixi.js';
import { UIPanel } from './UIPanel';

/**
 * Debug panel for switching map layouts at runtime.
 */
export class MapSelectPanel extends UIPanel {
  private onSelectMap?: (mapName: string) => void;
  private getMaps?: () => string[];
  private getCurrentMap?: () => string;
  private listItems: Container[] = [];
  private statusText: Text | null = null;

  constructor() {
    super();
    this.createPanelFrame(360, 540, 'Map Select', 'Switch layout for testing', 0x66ccff);
  }

  public setMapsProvider(getMaps: () => string[], getCurrentMap: () => string): void {
    this.getMaps = getMaps;
    this.getCurrentMap = getCurrentMap;
  }

  public setSelectCallback(callback: (mapName: string) => void): void {
    this.onSelectMap = callback;
  }

  protected override onOpen(): void {
    this.rebuildList();
  }

  private rebuildList(): void {
    for (const item of this.listItems) {
      this.contentContainer.removeChild(item);
      item.destroy({ children: true });
    }
    this.listItems = [];

    if (this.statusText) {
      this.contentContainer.removeChild(this.statusText);
      this.statusText.destroy();
      this.statusText = null;
    }

    const maps = this.getMaps?.() ?? [];
    const current = this.getCurrentMap?.() ?? '';

    this.statusText = new Text({
      text: maps.length === 0 ? 'No maps registered' : `Current: ${current || 'none'}`,
      style: { fontFamily: 'Arial', fontSize: 12, fill: 0xcccccc, fontStyle: 'italic' },
    });
    this.statusText.position.set(20, 55);
    this.contentContainer.addChild(this.statusText);

    let yPos = 85;
    for (const mapName of maps) {
      const isCurrent = mapName === current;
      const label = isCurrent ? `▶ ${this.formatLabel(mapName)}` : this.formatLabel(mapName);
      const color = isCurrent ? 0x00ff88 : mapName.startsWith('custom_') ? 0x4488cc : 0x66ccff;

      const btn = this.createActionButton(label, 320, 32, color, () => {
        this.onSelectMap?.(mapName);
        this.close();
      });
      btn.position.set(20, yPos);
      this.contentContainer.addChild(btn);
      this.listItems.push(btn);
      yPos += 40;
    }
  }

  private formatLabel(mapName: string): string {
    if (mapName.startsWith('custom_')) {
      return `Custom: ${mapName.slice('custom_'.length)}`;
    }
    return mapName.charAt(0).toUpperCase() + mapName.slice(1);
  }

  public update(_deltaTime: number): void {
    // Content refreshes on open
  }
}
