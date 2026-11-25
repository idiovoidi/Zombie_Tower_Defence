// biome-ignore lint/performance/noBarrelFile: intentional barrel for custom map module
export { CustomMapStore, customMapStore, type StorageLike } from './CustomMapStore';
export {
  appendSnappedWaypoint,
  removeLastWaypoint,
} from './gridSnap';
export {
  registerCustomMap,
  syncCustomMapsToManagers,
} from './registerCustomMap';
export {
  CUSTOM_MAP_SCHEMA_VERSION,
  type CustomMapDocument,
  type CustomWaveOverride,
  createEmptyCustomMapDocument,
} from './types';
export { validateCustomMap } from './validateCustomMap';
