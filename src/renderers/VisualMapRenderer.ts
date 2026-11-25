import { type Application, Container, Graphics } from 'pixi.js';
import { GRAVEYARD, LAYER_INDICES } from '../config/visualConstants';
import type { InputManager } from '../managers/InputManager';
import type { MapData, MapManager } from '../managers/MapManager';
import { FogRenderer } from './effects/FogRenderer';
import { CampRenderer } from './map/CampRenderer';
import { DecalRenderer } from './map/DecalRenderer';
import { GraveyardRenderer } from './map/GraveyardRenderer';
import { PathRenderer } from './map/PathRenderer';
import { StructureRenderer } from './map/StructureRenderer';
import { TerrainRenderer } from './map/TerrainRenderer';

export class VisualMapRenderer {
  private mapManager: MapManager;
  private inputManager: InputManager;
  private worldContainer: Container;
  private mapRoot: Container;
  private mapMask: Graphics;
  private mapContainer: Graphics;
  private pathGraphics: Graphics;
  private fogContainer: Graphics;
  private campAnimationContainer: Graphics;
  private decalContainer: Graphics;

  // Sub-renderers
  private terrainRenderer: TerrainRenderer;
  private pathRenderer: PathRenderer;
  private graveyardRenderer: GraveyardRenderer;
  private campRenderer: CampRenderer;
  private structureRenderer: StructureRenderer;
  private decalRenderer: DecalRenderer;
  private fogRenderer: FogRenderer;
  private onMapRendered: ((mapData: MapData | null) => void) | null = null;

  constructor(
    _app: Application,
    mapManager: MapManager,
    inputManager: InputManager,
    worldContainer: Container
  ) {
    this.mapManager = mapManager;
    this.inputManager = inputManager;
    this.worldContainer = worldContainer;

    this.mapRoot = new Container();
    this.mapContainer = new Graphics();
    this.mapMask = new Graphics();
    this.mapRoot.addChild(this.mapContainer);
    this.mapRoot.addChild(this.mapMask);
    this.mapRoot.mask = this.mapMask;

    this.pathGraphics = new Graphics();
    this.fogContainer = new Graphics();
    this.campAnimationContainer = new Graphics();
    this.decalContainer = new Graphics();

    // Initialize sub-renderers
    this.terrainRenderer = new TerrainRenderer(this.mapContainer);
    this.pathRenderer = new PathRenderer(this.mapContainer);
    this.graveyardRenderer = new GraveyardRenderer(this.mapContainer);
    this.campRenderer = new CampRenderer(this.pathGraphics, this.campAnimationContainer);
    this.structureRenderer = new StructureRenderer(this.mapContainer);
    this.decalRenderer = new DecalRenderer(this.decalContainer);
    this.fogRenderer = new FogRenderer(this.fogContainer);

    // Initialize fog for graveyard area
    this.fogRenderer.initialize(GRAVEYARD.X, GRAVEYARD.Y, GRAVEYARD.WIDTH, GRAVEYARD.HEIGHT);

    this.mapRoot.zIndex = LAYER_INDICES.MAP_BACKGROUND;
    this.pathGraphics.zIndex = LAYER_INDICES.PATH;
    this.decalContainer.zIndex = LAYER_INDICES.DECAL_ANIMATIONS;
    this.campAnimationContainer.zIndex = LAYER_INDICES.CAMP_ANIMATIONS;
    this.fogContainer.zIndex = LAYER_INDICES.FOG;

    this.worldContainer.addChild(this.mapRoot);
    this.worldContainer.addChild(this.pathGraphics);
    this.worldContainer.addChild(this.decalContainer);
    this.worldContainer.addChild(this.campAnimationContainer);
    this.worldContainer.addChild(this.fogContainer);

    this.inputManager.setWorldParent(this.worldContainer);
  }

  public setCampClickCallback(callback: () => void): void {
    this.inputManager.setCampClickCallback(callback);
  }

  public renderMap(_mapName: string): void {
    this.mapContainer.clear();
    this.pathGraphics.clear();
    this.mapMask.clear();

    const mapData = this.mapManager.getCurrentMap();
    if (!mapData) {
      this.onMapRendered?.(null);
      return;
    }

    // Clip terrain/structures to map bounds so soft blobs don't create jagged edges
    this.mapMask.rect(0, 0, mapData.width, mapData.height).fill(0xffffff);

    if (!this.fogRenderer.isInitialized()) {
      this.fogRenderer.initialize(GRAVEYARD.X, GRAVEYARD.Y, GRAVEYARD.WIDTH, GRAVEYARD.HEIGHT);
    }

    this.terrainRenderer.render(mapData);
    this.pathRenderer.render(mapData);
    this.renderForegroundElements(mapData);

    this.onMapRendered?.(mapData);
  }

  private renderForegroundElements(mapData: MapData): void {
    this.graveyardRenderer.render();
    this.structureRenderer.render(mapData);
    this.decalRenderer.initialize(mapData);

    const graphEnd = mapData.pathGraph
      ? mapData.pathGraph.nodes.find(n => n.id === mapData.pathGraph?.endId)
      : undefined;
    const endpoint = graphEnd
      ? { x: graphEnd.x, y: graphEnd.y }
      : mapData.waypoints[mapData.waypoints.length - 1];
    this.campRenderer.render(endpoint);

    const campPos = this.campRenderer.getCampPosition();
    this.inputManager.createCampClickArea(campPos.x, campPos.y);
  }

  public clear(): void {
    this.mapContainer.clear();
    this.pathGraphics.clear();
    this.mapMask.clear();
    this.decalRenderer.clear();
    this.fogRenderer.clear();
    this.inputManager.clearCampClickArea();
  }

  public updateFog(deltaTime: number): void {
    this.fogRenderer.update(deltaTime);
    this.decalRenderer.update(deltaTime);
    this.campRenderer.updateAnimations(deltaTime);
    this.fogRenderer.render();
  }

  public setOnMapRendered(callback: ((mapData: MapData | null) => void) | null): void {
    this.onMapRendered = callback;
  }
}
