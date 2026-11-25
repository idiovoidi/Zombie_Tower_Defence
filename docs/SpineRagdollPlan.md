> **Superseded (2026-11-26).** Kept for history only. The current zombie rig, ragdoll and corpse work is planned in the zombie overhaul plan and lives in `src/renderers/zombies/` (rig/, RagdollSkeleton, RagdollConfig). Spine was removed and the methods named below no longer exist.

Zombie Animation Overhaul: Procedural Ragdoll + Directional Blood Splatter
Background & Analysis
After researching the codebase, here's the situation with Spine:

@pixi/spine-pixi is installed (v2.0.0) and there's already a SpineZombieRenderer.ts class with ragdoll physics code
A SpineAssetManager.ts exists with skeleton registrations for basic, tank, and fast zombies
BUT: Only a single placeholder basic_zombie.json + .atlas exists in public/assets/spine/ — no actual skeleton art exists for any zombie type
The existing zombie renderers are all Graphics-based (programmatic drawing), and they look great — each type has detailed procedural art
IMPORTANT

Spine is the wrong tool here. Spine requires authored skeleton art (rigged in the Spine Editor with proper bone hierarchy, mesh attachments, atlas textures). You don't have any of this. The existing SpineZombieRenderer and SpineAssetManager are essentially dead code — they'll always fall back to the Graphics renderers because there are no real assets.

Recommended Approach: Procedural Ragdoll on the Existing Graphics System
Instead of Spine, I propose building a procedural multi-bone ragdoll system directly on top of the existing Graphics renderers. This gives you:

No external asset dependency — everything is code-driven
Works with the existing art style — each zombie type keeps its unique procedural look
True ragdoll physics — multi-segment bones with joints, gravity, constraints, and impulses
Directional death reactions — zombie body parts fly in the direction of the killing blow
Directional blood splatter — blood sprays in the direction of impact, not randomly
User Review Required
IMPORTANT

Removing Spine dead code: The existing SpineZombieRenderer.ts, SpineAssetManager.ts, and the placeholder Spine assets are unused dead code. Should I remove them as part of this overhaul, or leave them for potential future use?

WARNING

Scope: This is a significant overhaul touching the renderer system, particle system, corpse manager, and zombie death pipeline. The changes are backwards-compatible (existing rendering still works), but death animations will look dramatically different. Are you okay with that?

Open Questions
Blood splatter intensity: How gory should the directional blood splatter be? Options:

Moderate (current-ish): A few directional droplets + small spray cone
Heavy: Thick blood spray with pooling, wall splatter marks, longer-lasting blood decals
Extreme: Giblets, bone fragments flying, large persistent blood pools
Performance budget: Currently you support up to ~200 pooled zombies. Ragdoll adds per-bone physics. Should I cap ragdoll to only the N nearest on-screen deaths (e.g., max 10 simultaneous ragdolls)?

Walking animation enhancement: The current walk cycle is a sine-wave-based shamble. Should I also enhance the walk/idle animations with more articulated limb movement (arms swinging independently, head bobbing with more personality), or focus solely on death animations?

Proposed Changes
Component 1: Procedural Ragdoll Skeleton System
New physics system that decomposes a zombie's drawn body into articulated bone segments upon death.

[NEW] 
RagdollSkeleton.ts
Core ragdoll physics engine:

RagdollBone class: position, velocity, rotation, angular velocity, mass, length
RagdollConstraint: joint angle limits between connected bones
RagdollSkeleton: collection of bones with physics step (gravity, velocity integration, constraint solving, ground collision, damping)
Per-bone impulse application from directional impacts
Settlement detection (when total kinetic energy drops below threshold)
Configurable per zombie type (tank = heavy/slow settle, swarm = light/fast scatter, etc.)
[NEW] 
RagdollConfig.ts
Per-zombie-type ragdoll configurations:

Bone definitions (head, torso, upper arms, forearms, upper legs, lower legs)
Joint constraints (elbow bend limits, knee limits, neck rotation limits)
Mass distributions (tank = heavy torso, swarm = light everything)
Death impulse profiles per tower type:
Shotgun: Strong backward force on torso, head snaps back
Sniper: Head violently jerks, body delayed collapse
Grenade/Tesla: Explosive outward from center, limbs fly
Flame: Slow crumple, minimal directional force
Default (turret): Moderate tumble in shot direction
Component 2: Directional Blood Splatter System
Overhaul BloodParticleSystem to support directional emission.

[MODIFY] 
BloodParticleSystem.ts
Add a new method createDirectionalBloodSplatter(x, y, directionAngle, intensity, spread):

Particles emit in a cone centered on directionAngle with configurable spread
Higher intensity = more particles + faster velocity + larger size
Add blood trail particles that follow ragdoll bone positions during death
Add createBloodMist(x, y, radius) for explosive deaths
Add createBloodDrip(x, y, angle) for sniper headshots (narrow, high-velocity spray)
[MODIFY] 
ZombieParticleSystem.ts
Add directional emission support to emit():

New optional direction parameter: { angle: number, spread: number }
When provided, particles emit in a cone rather than omnidirectional
Add new particle types: BLOOD_MIST, BLOOD_TRAIL
Component 3: Death Animation Overhaul in BaseZombieRenderer
[MODIFY] 
BaseZombieRenderer.ts
Replace the existing 3-phase death animation with ragdoll-based death:

playDeathAnimation(killerType, impactDirection?) now accepts optional impact direction
Creates a RagdollSkeleton from the zombie's current bone positions
Applies tower-type-specific impulses in the impact direction
Renders ragdoll bones frame-by-frame until settlement
Emits directional blood particles from wound points during ragdoll
Each tower-specific death method (playKnockbackDeathAnimation, etc.) now calculates proper directional impulses
Component 4: Zombie Death Data Enhancement
[MODIFY] 
Zombie.ts
Enhance death event to carry directional information:

Track lastDamageSourcePosition: { x: number, y: number } (position of tower/projectile that killed)
Include impact direction in zombieDeath event payload
Add lastDamageDirection getter for renderers to use
[MODIFY] 
Projectile.ts
Pass projectile position to zombie on hit so the zombie knows the impact direction.

Component 5: Enhanced Corpse System
[MODIFY] 
CorpseManager.ts
Corpse pose should reflect how the zombie died (ragdoll final position)
Directional blood pool: blood pools extend in the impact direction
Tower-type-specific corpse variations (charred for flame, fragmented for grenade)
[MODIFY] 
ZombieManager.ts
Pass impact direction through to blood splatter system
onZombieDeath uses directional blood instead of omnidirectional
Component 6: Walking Animation Enhancement (Optional — pending your answer)
[MODIFY] 
ZombieAnimator.ts
More bone-like articulation: separate upper/lower arm angles, shoulder rotation
Head lolling with more personality (random twitches, looking around)
Per-type gaits: Tank lumbers with weight shift, Fast has darting head movements, Stealth slinks low
Damage-reactive animations: limp when low health, drag leg, hold wounded arm
Summary of File Changes
File	Action	Description
RagdollSkeleton.ts	NEW	Core ragdoll physics engine
RagdollConfig.ts	NEW	Per-type ragdoll configurations
BloodParticleSystem.ts	MODIFY	Add directional blood splatter
ZombieParticleSystem.ts	MODIFY	Add directional emission
BaseZombieRenderer.ts	MODIFY	Ragdoll-based death animation
Zombie.ts	MODIFY	Track impact direction
Projectile.ts	MODIFY	Pass position on hit
CorpseManager.ts	MODIFY	Directional corpse poses/blood
ZombieManager.ts	MODIFY	Wire up directional blood
ZombieAnimator.ts	MODIFY	(Optional) Enhanced walk cycles
Verification Plan
Automated Tests
Run npm run type-check to verify TypeScript compiles
Run npm test to ensure no regressions
Run npm run lint to verify code quality
Manual/Browser Verification
Launch dev server (npm run dev) and play through waves
Verify each tower type produces distinct, directional death animations:
Shotgun: zombie flies backward from impact direction
Sniper: head snaps, body delayed collapse
Grenade: explosive scatter
Tesla: electric convulsion
Flame: slow crumple with charring
Verify blood sprays in the direction of impact (not random)
Verify corpses reflect death direction
Verify performance: no frame drops with 50+ simultaneous zombie deaths
Record browser session demonstrating the effects