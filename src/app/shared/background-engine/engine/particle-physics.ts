// Physics engine class handling multi-planet gravitational competition, explosion lockouts, core collection, and smooth click explosions.
import { EngineConfig, Particle, Planet } from './particle.model';

export class ParticlePhysics {
  // ==========================================
  // MANUAL EXPLOSION STRENGTH ADJUSTMENT AREA
  // ==========================================
  private readonly clickExplosionPower = 6.0;

  public updateParticles(
    particles: Particle[],
    planets: Planet[],
    config: EngineConfig,
    speedMultiplier: number,
    width: number,
    height: number,
    isMouseActive: boolean,
    mouseX: number,
    mouseY: number
  ): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const now = Date.now();
    const effectiveSpeedDiv = Math.max(1, speedMultiplier);

    for (const p of particles) {
      p.orbitalAngle += p.orbitalSpeed * 0.01 * speedMultiplier;

      if (p.interactionCooldown && p.interactionCooldown > 0) {
        p.interactionCooldown -= speedMultiplier;
      }

      const targetX = isMouseActive ? mouseX : centerX;
      const targetY = isMouseActive ? mouseY : centerY;

      const dxTarget = targetX - p.x;
      const dyTarget = targetY - p.y;
      const distTarget = Math.sqrt(dxTarget * dxTarget + dyTarget * dyTarget);

      if (isMouseActive && distTarget < config.mouseGravityRadius && distTarget > 10) {
        const pull = ((config.mouseGravityRadius - distTarget) / config.mouseGravityRadius) * 0.15;
        p.vx += (dxTarget / distTarget) * pull;
        p.vy += (dyTarget / distTarget) * pull;
      } else if (distTarget < 400) {
        const perpX = -dyTarget / distTarget;
        const perpY = dxTarget / distTarget;
        p.vx += perpX * 0.01 * p.orbitalSpeed;
        p.vy += perpY * 0.01 * p.orbitalSpeed;
      }

      let closestPlanet: Planet | null = null;
      let minPlanetDist = Infinity;

      for (const planet of planets) {
        const dx = planet.x - p.x;
        const dy = planet.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minPlanetDist) {
          minPlanetDist = dist;
          closestPlanet = planet;
        }
      }

      let inAnyPlanetZone = false;

      if (closestPlanet && (!p.interactionCooldown || p.interactionCooldown <= 0)) {
        const dxPlanet = closestPlanet.x - p.x;
        const dyPlanet = closestPlanet.y - p.y;
        const distPlanet = minPlanetDist;
        
        const enterRadius = closestPlanet.radius * 4.5;
        const exitRadius = closestPlanet.radius * 5.8;

        const isCurrentlyInside = p.activePlanetInteraction && p.activePlanetInteraction.planetId === closestPlanet.id;

        if (distPlanet < (isCurrentlyInside ? exitRadius : enterRadius)) {
          inAnyPlanetZone = true;

          if (!isCurrentlyInside) {
            const rand = Math.random();
            const behavior: 'bounce' | 'behind' | 'over' | 'tangential' =
              rand < 0.25 ? 'bounce' : rand < 0.50 ? 'behind' : rand < 0.75 ? 'over' : 'tangential';
            p.activePlanetInteraction = { planetId: closestPlanet.id, behavior };
          }

          const behavior = p.activePlanetInteraction!.behavior;
          const perpX = -dyPlanet / distPlanet;
          const perpY = dxPlanet / distPlanet;

          if (behavior === 'bounce') {
            if (distPlanet < closestPlanet.radius + 6) {
              const nx = dxPlanet / distPlanet;
              const ny = dyPlanet / distPlanet;
              p.vx = -nx * (4.0 + Math.random() * 2.0) / effectiveSpeedDiv;
              p.vy = -ny * (4.0 + Math.random() * 2.0) / effectiveSpeedDiv;
              p.activePlanetInteraction = undefined;
              p.interactionCooldown = 40; // Prevent immediate re-capture
            } else {
              p.vx += ((dxPlanet / distPlanet) * 0.08) / effectiveSpeedDiv;
              p.vy += ((dyPlanet / distPlanet) * 0.08) / effectiveSpeedDiv;
            }
          } else if (behavior === 'behind' || behavior === 'over') {
            p.vx += ((dxPlanet / distPlanet) * 0.12) / effectiveSpeedDiv;
            p.vy += ((dyPlanet / distPlanet) * 0.12) / effectiveSpeedDiv;
          } else {
            p.vx += (((dxPlanet / distPlanet) * 0.06) + (perpX * 0.05)) / effectiveSpeedDiv;
            p.vy += (((dyPlanet / distPlanet) * 0.06) + (perpY * 0.05)) / effectiveSpeedDiv;
          }
        }
      }

      // Moons gravity check
      for (const planet of planets) {
        for (const moon of planet.moons) {
          const dxMoon = moon.x - p.x;
          const dyMoon = moon.y - p.y;
          const distMoon = Math.sqrt(dxMoon * dxMoon + dyMoon * dyMoon);
          const moonGravityRadius = moon.radius * 4;

          if (distMoon < moonGravityRadius && distMoon > moon.radius) {
            const moonPull = ((moonGravityRadius - distMoon) / moonGravityRadius) * 0.03;
            p.vx += ((dxMoon / distMoon) * moonPull) / effectiveSpeedDiv;
            p.vy += ((dyMoon / distMoon) * moonPull) / effectiveSpeedDiv;
          }
        }
      }

      // Planet Explosion Logic with post-explosion re-entry lockout
      for (const planet of planets) {
        const realTimeElapsed = (now - planet.lastExplosionTime) * speedMultiplier;
        
        if (realTimeElapsed >= planet.cooldownMs) {
          const particlesInsidePlanet = particles.filter(
            targetP => targetP.activePlanetInteraction?.planetId === planet.id &&
            Math.sqrt((targetP.x - planet.x) ** 2 + (targetP.y - planet.y) ** 2) < planet.radius * 0.95
          );

          if (particlesInsidePlanet.length >= planet.particleThreshold) {
            if (!planet.isExplosionDelayed) {
              planet.isExplosionDelayed = true;
              planet.explosionDelayTimer = now + (400 + Math.random() * 800);
            } else if (now >= planet.explosionDelayTimer) {
              planet.lastExplosionTime = now;
              planet.cooldownMs = 5000 + Math.random() * 2500;
              planet.particleThreshold = Math.floor(10 + Math.random() * 6);
              planet.isExplosionDelayed = false;

              for (const targetP of particlesInsidePlanet) {
                targetP.isBlinking = true;
                targetP.blinkDuration = 30;
                const pDx = targetP.x - planet.x;
                const pDy = targetP.y - planet.y;
                const pDist = Math.sqrt(pDx * pDx + pDy * pDy) || 1;
                const blastForce = (6.0 + Math.random() * 4.0) / effectiveSpeedDiv;
                targetP.vx += (pDx / pDist) * blastForce;
                targetP.vy += (pDy / pDist) * blastForce;
                targetP.activePlanetInteraction = undefined;
                targetP.interactionCooldown = 60; // Force particles to travel outward into open space before being eligible for re-capture
              }
            }
          }
        }
      }

      if (!inAnyPlanetZone && p.activePlanetInteraction) {
        const activePlanet = planets.find(pl => pl.id === p.activePlanetInteraction?.planetId);
        if (activePlanet) {
          const dx = activePlanet.x - p.x;
          const dy = activePlanet.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > activePlanet.radius * 5.8) {
            p.activePlanetInteraction = undefined;
          }
        } else {
          p.activePlanetInteraction = undefined;
        }
      }

      if (p.clusterId !== undefined) {
        for (const other of particles) {
          if (other.clusterId === p.clusterId && other.id !== p.id) {
            const cdx = other.x - p.x;
            const cdy = other.y - p.y;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cdist < 150 && cdist > 20) {
              p.vx += (cdx / cdist) * 0.01 / effectiveSpeedDiv;
              p.vy += (cdy / cdist) * 0.01 / effectiveSpeedDiv;
            }
          }
        }
      }

      p.vx *= 0.98;
      p.vy *= 0.98;

      p.x += p.vx * speedMultiplier;
      p.y += p.vy * speedMultiplier;

      if (p.isBlinking) {
        p.blinkDuration -= speedMultiplier;
        if (p.blinkDuration <= 0) {
          p.isBlinking = false;
        }
      }
    }
  }

  public applyExplosion(
    particles: Particle[],
    chargeX: number,
    chargeY: number,
    intensity: number,
    speedMultiplier: number = 1.0
  ): void {
    const blastRadius = 200 * intensity;
    const effectiveSpeedDiv = Math.max(1, speedMultiplier);

    for (const p of particles) {
      const dx = p.x - chargeX;
      const dy = p.y - chargeY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < blastRadius || p.activePlanetInteraction) {
        p.isBlinking = true;
        p.blinkDuration = Math.floor(20 * intensity);
        
        const effectiveDist = dist < blastRadius ? dist : blastRadius * 0.5;
        const force = ((blastRadius - effectiveDist) / blastRadius) * this.clickExplosionPower * intensity / effectiveSpeedDiv;
        
        const angle = Math.atan2(dy, dx);
        p.vx += Math.cos(angle) * force;
        p.vy += Math.sin(angle) * force;
        p.activePlanetInteraction = undefined;
        p.interactionCooldown = 40;
      }
    }
  }
}