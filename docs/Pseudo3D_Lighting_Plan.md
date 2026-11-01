# Pseudo-3D Lighting System Design Plan

> **Implementation status (current):** shipped, with one deliberate deviation.
>
> | Part | Status |
> |---|---|
> | Tower shadows | Done — `renderers/lighting/TowerShadow.ts`, driven by the shared light |
> | Surface shading | Done, **simplified**: instead of per-type procedural normal maps, `TowerLightingFilter` estimates bevel normals from each sprite's own silhouette and brightness edges, so every tower type and upgrade level is shaded automatically with no cached textures |
> | Shooting illumination | Done — `Tower.updateShotGlow`, ~130ms, per-type colour |
> | Bullet glow | Done — `Projectile.drawGlow`, 6px halo, ±5% pulse, flame skipped (has its own) |
> | Animated normals / pulsing lights | Done (see below) |
> | Environmental lighting + day/night | Done (see below) |
> | Dynamic light direction | Done — `LightingManager.setLightDirection(angle, elevation)`; `dev.light(angle, elevation)` in the console |
>
> Tuning lives in `config/lightingConstants.ts`. `?shading=0` disables the GPU shading. The shader is
> pre-validated in a throwaway WebGL2 context, so an unsupported driver falls back to no shading
> rather than invisible towers. **Note:** the original plan said a bloom filter already existed in the
> codebase; it does not, and the glow here is geometry-based rather than a post-process bloom.
> **Animated lighting (done):** the rotating gunner/barrel goes through the same filter. Because Pixi
> filters run in screen space, the light does not turn with the sprite, so its lit/shadowed edges update
> live as the barrel tracks targets (verified: lit edges identical at 0° and 90° rotation). Tesla
> towers pulse a cyan light, Flame towers flicker orange, Sludge breathes green (`AMBIENT_GLOW`,
> random phase per tower, driven by game time so it freezes when paused).
> **Environmental lighting (done):** explosions, Tesla arcs and fire pools drop timed point lights
> (`LightingManager.addPointLight`, capped at 24). Towers within reach get an additive glow in the
> light's colour, shifted toward the source so it reads as directional; strength falls off
> quadratically and fades with the light's life. `dev.pointLight(x, y)` drops one for testing.
> **Day/night cycle (done, ON by default):** `getTimeOfDay(phase)` gives the light angle/elevation and
> an ambient tint (dawn/dusk amber, midnight blue); the sun/moon crosses right to left so shadows and
> shading swing across the map. One day is 600 game seconds (`DAY_NIGHT.DEFAULT_CYCLE_SECONDS`, about
> one Level 1 run) and every run starts just after dawn. It runs on game time, so it pauses with the
> game and runs faster at 2x/4x. `?daynight=0` turns it off, `?daynight=N` sets a custom day length,
> and `dev.dayNight(seconds)` / `dev.timeOfDay(phase)` change it at runtime. The HUD is never tinted.
> Not done: a settings UI for any of this, and lighting for zombies (towers only).

## Overview

Implement a **pseudo-3D lighting system** that adds depth and visual richness to the 2D tower defense game through dynamic shadows, normal map-based lighting, and subtle bloom effects.

---

## Core Requirements

### 1. Tower Shadows
**Goal:** Towers should cast realistic drop shadows on the ground.

**Visual Description:**
```
     [TOWER]          ← Light source from top-right
        \\             ↘
         \\            ↘
          [SHADOW]      ← Shadow projects away from light
```

**Technical Approach:**
- Render shadows on a dedicated shadow layer (z-index below towers)
- Shadows are elongated ellipses based on light angle and tower height
- Light direction configurable (e.g., 45° from top-right)
- Shadow opacity: ~40%
- Shadow length scales with tower upgrade level

---

### 2. Tower Dynamic Lighting (Normal Maps)
**Goal:** Towers should react to lighting direction with realistic 3D surface shading.

**Visual Description:**
```
    Light →   [TOWER BASE]
              /‾‾‾‾‾‾‾‾‾‾\     ← Lit side (brighter)
             /            \
            |   Barrel     |   ← Surface normals affect shading
             \\            /
              \\__________/     ← Shadow side (darker)
```

**Technical Approach:**
- Generate procedural normal maps for each tower type:
  - **Cylindrical** (Sniper, Shotgun, MachineGun, TeslaCoil): Round barrel normals
  - **Box-shaped** (FlameThrower, Mortar): Flat surface normals with edges
  - **Dome-shaped** (Generic towers): Curved normals radiating from center

- Normal map colors (RGB):
  - Purple/Blue (128, 128, 255) = flat surface
  - Red tint = facing right
  - Green tint = facing up
  - Blue intensity = depth/Z-component

- Apply **NormalMapLightingFilter** shader to tower sprites
- Real-time light direction updates for day/night cycle effect

---

### 3. Shooting Illumination
**Goal:** Towers should briefly light up when firing.

**Visual Description:**
```
    Before:       During Shot:        After:
    [Tower]       [Tower]✨           [Tower]
                  ↑ faint glow around tower base
                  ↑ muzzle flash at barrel tip
```

**Requirements:**
- Very subtle (2-8% opacity) - just enough to notice
- Color-coded by tower type:
  - Standard: Warm white/orange
  - Flame: Yellow/orange
  - Tesla: Cyan/blue
  - Laser: Red
- Duration: ~120ms
- Scale: ~1.5x tower base size
- Must NOT overpower the normal map lighting

---

### 4. Bullet Bloom/Glow
**Goal:** Projectiles should have a subtle glow indicating they're hot/active.

**Visual Description:**
```
    ●→
    ↑ very tight, subtle glow hugging the bullet
    ↑ 6px radius max
    ↑ ~10% opacity soft glow
```

**Requirements:**
- Glow must **tightly follow** the bullet position every frame
- Radius: 6px maximum (very compact)
- Opacity: ~10% (barely visible, just an impression)
- Color-coded by projectile type:
  - Bullet: Yellow
  - Sniper: Red-orange
  - Flame: Yellow-orange
  - Tesla: Cyan
  - Grenade: Red
  - Sludge: Green
- Pulse animation: very subtle (±5% scale variation)

---

## Implementation Architecture

### Components

```
┌─────────────────────────────────────────┐
│           LightingManager               │
│  ┌─────────────────────────────────┐    │
│  │      TowerShadowRenderer        │    │
│  │  - Drop shadows on ground       │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │        TowerLighting            │    │
│  │  - Normal map generation        │    │
│  │  - NormalMapLightingFilter       │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │     BulletLightingEffect        │    │
│  │  - Projectile glow/bloom        │    │
│  │  - Muzzle flashes               │    │
│  │  - Tower shooting illumination  │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Filters/Shaders

1. **NormalMapLightingFilter**
   - Takes base color texture + normal map texture
   - Calculates lighting: Ambient + Diffuse (Lambert) + Specular (Blinn-Phong)
   - Uniforms: light direction, ambient level, diffuse intensity

2. **BloomFilter** (for bullet glow)
   - Threshold-based bloom on bright pixels
   - Already implemented in codebase

### Normal Map Generator

**Procedural Generation Functions:**

```typescript
// Cylindrical (barrels, turrets)
generateCylinderNormalMap(radius, height)
  → Creates outward-facing normals in circular pattern
  → Top surface faces camera (blue)
  → Sides angle outward (red/green gradients)

// Box-shaped (bases, structures)  
generateBoxNormalMap(width, height, depth)
  → Flat top surface facing camera
  → Side normals point in cardinal directions
  → Beveled edges for smooth lighting

// Procedural/Dome (generic towers)
generateProceduralNormalMap(graphics, heightScale)
  → Height from brightness analysis
  → Normals calculated from height gradients
```

---

## Visual Style Guidelines

### Opacity Levels
| Effect | Opacity | Notes |
|--------|---------|-------|
| Tower Shadows | 40% | Visible but not distracting |
| Normal Map Lighting | 100% | Full surface shading |
| Tower Shooting Flash | 2-8% | Very subtle hint |
| Bullet Glow | 10% | Just noticeable |
| Muzzle Flash | 30% | Brief but visible |

### Colors
- **Warm palette** for standard towers (white, yellow, orange)
- **Cool palette** for energy towers (cyan, blue)
- **Intense colors** for hazard towers (red, green)

### Performance Considerations
- Cache normal map textures per tower type
- Limit simultaneous lit projectiles (~30 max)
- Throttle shadow updates (every 2nd frame)
- Use object pooling for glow effects

---

## Integration Points

### Tower Creation Flow
```typescript
// In Tower.setEffectManager()
1. Register tower shadow
2. Apply normal map lighting to base
3. Apply normal map lighting to barrel
4. Store reference for cleanup

// In Tower.destroy()
1. Unregister tower shadow
2. Remove normal map lighting from base
3. Remove normal map lighting from barrel
```

### Shooting Flow
```typescript
// In Tower.showShootingEffect()
1. Render muzzle flash at barrel tip
2. Render tower body illumination flash (subtle)
3. Create projectile with glow effect
```

### Light Direction Changes
```typescript
// Day/night cycle or dynamic lighting
lightingManager.setLightDirection(angle, elevation)
  → Updates shadow angles
  → Updates normal map light direction
  → All towers respond simultaneously
```

---

## Known Issues to Avoid

1. **Frozen filters array** - PixiJS freezes the filters array after assignment
   - Solution: Always create a new array: `container.filters = [...currentFilters, newFilter]`

2. **Glow not following bullets** - Must update position every frame in update()
   - Solution: Store projectile reference, call getGlobalPosition() each frame

3. **Lighting too intense** - Easy to make effects too bright
   - Solution: Start very low opacity (5-10%), increase gradually

4. **Normal map generation overhead** - Creating textures can be expensive
   - Solution: Cache by tower type, reuse textures

---

## Future Enhancements

- Animated normal maps for rotating barrels
- Light pulsing for Tesla towers
- Environmental lighting (fire pits, explosions affecting nearby towers)
- Day/night cycle with smooth light transitions
- Shadow softness/blur based on light elevation

---

## Files to Modify/Create

### New Files
- `src/renderers/lighting/TowerShadowRenderer.ts`
- `src/renderers/lighting/TowerLighting.ts`
- `src/renderers/lighting/BulletLightingEffect.ts`
- `src/renderers/lighting/NormalMapGenerator.ts`
- `src/ui/shaders/filters/NormalMapLightingFilter.ts`
- `src/config/lightingConstants.ts`

### Modified Files
- `src/renderers/lighting/LightingManager.ts` - Main orchestrator
- `src/renderers/effects/EffectManager.ts` - Integration
- `src/objects/Tower.ts` - Apply lighting on creation
- `src/objects/Projectile.ts` - Add glow on creation
- `src/managers/ProjectileManager.ts` - Pass EffectManager to projectiles

---

## Success Criteria

1. ✅ Towers cast shadows that project away from light source
2. ✅ Tower surfaces show dynamic 3D shading based on light angle
3. ✅ Towers briefly illuminate when shooting (very subtle)
4. ✅ Bullets have tight, subtle glow that follows them
5. ✅ All effects are performant with many towers/projectiles
6. ✅ Light direction can be changed dynamically
