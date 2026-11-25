> **Superseded (2026-11-26).** Kept for history only. The current zombie rig, ragdoll and corpse work is planned in the zombie overhaul plan and lives in `src/renderers/zombies/` (rig/, RagdollSkeleton, RagdollConfig). Spine was removed and the methods named below no longer exist.

# Spine Integration for Zombie Tower Defense

This document describes the Spine animation integration for improved zombie animations and ragdoll death effects.

## Overview

Spine provides:
- **Smooth skeletal animations** with interpolation and blending
- **Physics-based ragdoll** death sequences per damage type
- **Mesh deformation** for realistic body reactions
- **Attachment swapping** for dynamic zombie variants

## Architecture

```
BaseZombieRenderer (existing)
    └── SpineZombieRenderer (new)

SpineAssetManager (singleton)
    ├── Preloads skeleton data
    ├── Manages ragdoll configs
    └── Provides cached assets
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install `@pixi/spine-pixi` v2.0.0 which is compatible with PixiJS v8.

### 2. Preload Skeleton Assets

In `main.ts` or your initialization code:

```typescript
import { SpineAssetManager } from './managers/SpineAssetManager';

// During game initialization
const spineManager = SpineAssetManager.getInstance();
await spineManager.preloadAll();
```

### 3. Create Spine-Based Zombie Renderers

Instead of `BasicZombieRenderer`, use `SpineZombieRenderer`:

```typescript
import { SpineZombieRenderer } from './renderers/zombies/SpineZombieRenderer';
import { SpineAssetManager } from './managers/SpineAssetManager';

async function createSpineZombieRenderer(zombieType: string) {
  const assetManager = SpineAssetManager.getInstance();
  
  // Get skeleton data for zombie type
  const skeletonData = assetManager.getSkeletonData(`${zombieType.toLowerCase()}_zombie`);
  if (!skeletonData) {
    // Fall back to graphics-based renderer
    return new BasicZombieRenderer();
  }
  
  // Create Spine renderer
  const renderer = new SpineZombieRenderer(
    skeletonData,
    {
      enabled: true,
      gravity: 500,
      boneMass: assetManager.getRagdollConfig(`${zombieType.toLowerCase()}_zombie`) ?? new Map(),
      constraints: assetManager.getRagdollConstraints(`${zombieType.toLowerCase()}_zombie`) ?? [],
    }
  );
  
  // Load the skeleton (async)
  const loaded = await renderer.load();
  if (!loaded) {
    console.warn(`Failed to load Spine skeleton for ${zombieType}, using fallback`);
    return new BasicZombieRenderer();
  }
  
  return renderer;
}
```

### 4. Integration with ZombieManager

Modify your zombie spawning to support Spine renderers:

```typescript
// In your ZombieManager or similar
async spawnZombieWithSpine(type: string, position: { x: number, y: number }) {
  const renderer = await createSpineZombieRenderer(type);
  
  const zombie = new Zombie(type, position, renderer);
  this.zombies.push(zombie);
  
  return zombie;
}
```

## Creating Spine Skeletons

### Using Spine Editor (Recommended)

1. **Purchase Spine** from [esotericsoftware.com](https://esotericsoftware.com)
2. **Create new project** with the following bone structure:
   ```
   root
   ├── torso
   │   ├── head
   │   ├── arm_l
   │   └── arm_r
   ├── leg_l
   └── leg_r
   ```
3. **Create animations**:
   - `idle` - Subtle breathing/twitching
   - `walk` - Leg and arm swing cycle
   - `walk_burning` - Panicked movement
   - `frozen` - Static pose
   - `death` - Collapse pose (for non-ragdoll fallback)
4. **Export** to JSON format
5. **Place files** in `public/assets/spine/`

### Manual JSON Creation

See `public/assets/spine/basic_zombie.json` for a template. Key sections:

- `bones`: Skeleton hierarchy
- `slots`: Attachment points
- `skins`: Graphics/attachments
- `animations`: Keyframe data

## Ragdoll Configuration

Ragdoll physics are configured per zombie type:

```typescript
{
  id: 'basic_zombie',
  ragdollConfig: {
    gravity: 500, // Pixels/second²
    boneMass: {
      root: 5,
      torso: 10,
      head: 3,
      arm_l: 2,
      arm_r: 2,
      leg_l: 3,
      leg_r: 3,
    },
    constraints: [
      // Limit rotation between connected bones
      { boneA: 'torso', boneB: 'head', minAngle: -0.5, maxAngle: 0.5 },
      { boneA: 'torso', boneB: 'arm_l', minAngle: -2, maxAngle: 2 },
      { boneA: 'torso', boneB: 'arm_r', minAngle: -2, maxAngle: 2 },
    ],
  },
}
```

## Death Animation Types

The `SpineZombieRenderer` automatically applies different ragdoll forces based on killer type:

| Killer Type | Effect |
|-------------|--------|
| `Flame` | Slow collapse, minimal force |
| `Grenade` / `Tesla` | Violent explosive throw upward and outward |
| `Shotgun` | Strong backward knockback |
| `Sniper` | Head flies back, delayed body collapse |
| `default` | Random tumble |

These are implemented in `SpineZombieRenderer.calculateDeathImpulses()`.

## Migration Strategy

### Phase 1: Parallel Implementation
- Keep existing `BasicZombieRenderer` as fallback
- Add `SpineZombieRenderer` as optional enhancement
- Use feature detection to enable Spine when assets are available

### Phase 2: Asset Creation
- Create Spine skeletons for each zombie type
- Test animations and ragdoll behavior
- Fine-tune physics parameters

### Phase 3: Full Migration
- Remove fallback graphics renderers
- Optimize Spine rendering pipeline
- Add advanced features (mesh deformation, attachment swapping)

## Performance Considerations

### Pros
- GPU-accelerated mesh rendering
- Fewer draw calls (single mesh vs multiple Graphics calls)
- Efficient animation blending

### Cons
- Higher memory usage (skeleton data)
- Loading time for skeleton assets
- Spine Editor license cost ($69+)

### Optimization Tips
1. **Preload** skeletons during level loading
2. **Reuse** Spine instances via object pooling
3. **Simplify** mesh complexity for distant zombies
4. **Cull** off-screen Spine instances

## Troubleshooting

### Skeleton Not Loading
```
[SpineAssetManager] Failed to load skeleton basic_zombie
```
- Check file paths in `public/assets/spine/`
- Verify JSON syntax
- Ensure atlas file references correct texture paths

### Ragdoll Physics Not Working
- Verify `ragdollConfig.enabled` is `true`
- Check bone names match skeleton JSON
- Ensure `SpineZombieRenderer.load()` completed successfully

### Performance Issues
- Reduce mesh vertex count in Spine Editor
- Use simpler animations for background zombies
- Implement LOD system (simpler graphics for distant zombies)

## API Reference

### SpineZombieRenderer

```typescript
class SpineZombieRenderer extends BaseZombieRenderer {
  constructor(skeletonData: SpineSkeletonData, ragdollConfig?: RagdollConfig)
  
  async load(): Promise<boolean>
  override render(container: Container, state: ZombieRenderState): void
  override update(deltaTime: number, state: ZombieRenderState): void
  override async playDeathAnimation(killerType?: string): Promise<void>
  override reset(): void
  override destroy(): void
  
  getSpine(): Spine | null
  isSpineLoaded(): boolean
}
```

### SpineAssetManager

```typescript
class SpineAssetManager {
  static getInstance(): SpineAssetManager
  
  registerSkeleton(entry: ZombieSkeletonEntry): void
  async preloadAll(): Promise<void>
  async loadSkeleton(id: string): Promise<boolean>
  
  getSkeletonData(id: string): SpineSkeletonData | null
  getRagdollConfig(id: string): Map<string, number> | null
  getRagdollConstraints(id: string): RagdollConstraint[] | null
  
  isSkeletonLoaded(id: string): boolean
  getLoadingProgress(): number
}
```

## Example: Complete Integration

See `src/examples/SpineZombieExample.ts` for a working integration example.

```typescript
// Complete working example
import { Container } from 'pixi.js';
import { SpineZombieRenderer } from '../renderers/zombies/SpineZombieRenderer';
import { SpineAssetManager } from '../managers/SpineAssetManager';

export async function createSpineZombie(container: Container) {
  // Initialize asset manager
  const assetManager = SpineAssetManager.getInstance();
  
  // Ensure skeleton is loaded
  if (!assetManager.isSkeletonLoaded('basic_zombie')) {
    await assetManager.loadSkeleton('basic_zombie');
  }
  
  // Get skeleton data
  const skeletonData = assetManager.getSkeletonData('basic_zombie');
  if (!skeletonData) {
    throw new Error('Failed to load skeleton data');
  }
  
  // Create renderer with ragdoll physics
  const renderer = new SpineZombieRenderer(
    skeletonData,
    {
      enabled: true,
      gravity: 500,
      boneMass: assetManager.getRagdollConfig('basic_zombie') ?? new Map(),
      constraints: assetManager.getRagdollConstraints('basic_zombie') ?? [],
    }
  );
  
  // Load the Spine instance
  const loaded = await renderer.load();
  if (!loaded) {
    throw new Error('Failed to initialize Spine renderer');
  }
  
  // Initial render
  renderer.render(container, {
    position: { x: 100, y: 100 },
    health: 100,
    maxHealth: 100,
    speed: 1,
    direction: { x: 1, y: 0 },
    isMoving: true,
    isDamaged: false,
    statusEffects: [],
  });
  
  // Trigger death animation with ragdoll
  await renderer.playDeathAnimation('Grenade');
  
  return renderer;
}
```

## License

Spine Runtime is MIT licensed. Spine Editor requires a commercial license for professional use.
