// Physics engine class handling particle movement, orbital tangential deflection, stuck-particle cleanup, and explosions.
import { EngineConfig, Particle, Planet } from './particle.model';

export class ParticlePhysics {
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

    for (const p of particles) {
      p.orbitalAngle += p.orbitalSpeed * 0.01 * speedMultiplier;

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
        p.vx += perpX * 0.02 * p.orbitalSpeed;
        p.vy += perpY * 0.02 * p.orbitalSpeed;
      }

      let isStuck = false;

      // Gravitational slingshot and orbital deflection around planets
      for (const planet of planets) {
        const dxPlanet = planet.x - p.x;
        const dyPlanet = planet.y - p.y;
        const distPlanet = Math.sqrt(dxPlanet * dxPlanet + dyPlanet * dyPlanet);
        const gravityRadius = planet.radius * 5.5;

        if (distPlanet < gravityRadius) {
          if (distPlanet < planet.radius + 4) {
            // Hard exclusion boundary: push particle out so it never clumps inside the node
            const pushAngle = Math.atan2(-dyPlanet, -dxPlanet);
            p.vx += Math.cos(pushAngle) * 0.8;
            p.vy += Math.sin(pushAngle) * 0.8;
            isStuck = true;
          } else {
            // Tangential orbital slingshot force (orbits instead of clumping)
            const pullFactor = (gravityRadius - distPlanet) / gravityRadius;
            const perpX = -dyPlanet / distPlanet;
            const perpY = dxPlanet / distPlanet;

            // Blend inward pull with strong orbital tangential velocity
            p.vx += (dxPlanet / distPlanet) * (pullFactor * 0.03) + perpX * 0.08 * speedMultiplier;
            p.vy += (dyPlanet / distPlanet) * (pullFactor * 0.03) + perpY * 0.08 * speedMultiplier;

            // Check if particle velocity has stalled (stuck near planet center)
            const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (currentSpeed < 0.2) {
              isStuck = true;
            }
          }
        }

        // Moons gravity check
        for (const moon of planet.moons) {
          const dxMoon = moon.x - p.x;
          const dyMoon = moon.y - p.y;
          const distMoon = Math.sqrt(dxMoon * dxMoon + dyMoon * dyMoon);
          const moonGravityRadius = moon.radius * 5;

          if (distMoon < moonGravityRadius && distMoon > moon.radius) {
            const moonPull = ((moonGravityRadius - distMoon) / moonGravityRadius) * 0.03;
            const perpX = -dyMoon / distMoon;
            const perpY = dxMoon / distMoon;
            p.vx += (dxMoon / distMoon) * moonPull + perpX * 0.05;
            p.vy += (dyMoon / distMoon) * moonPull + perpY * 0.05;
          }
        }
      }

      // If a particle gets stuck or trapped near a planet for too long, initiate graceful fade out
      if (isStuck) {
        if (!p.stuckStartTime) {
          p.stuckStartTime = now;
        } else if (now - p.stuckStartTime > 1000 && p.fadeState !== 'out') {
          p.fadeState = 'out';
          p.fadeSpeed = 0.04;
        }
      } else {
        p.stuckStartTime = undefined;
      }

      if (p.clusterId !== undefined) {
        for (const other of particles) {
          if (other.clusterId === p.clusterId && other.id !== p.id) {
            const cdx = other.x - p.x;
            const cdy = other.y - p.y;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cdist < 150 && cdist > 20) {
              p.vx += (cdx / cdist) * 0.01;
              p.vy += (cdy / cdist) * 0.01;
            }
          }
        }
      }

      // Standard linear friction step
      p.vx *= 0.98;
      p.vy *= 0.98;

      // Position update scaled linearly by simulation speed
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
    intensity: number
  ): void {
    const blastRadius = 200 * intensity;

    for (const p of particles) {
      const dx = p.x - chargeX;
      const dy = p.y - chargeY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < blastRadius) {
        p.isBlinking = true;
        p.blinkDuration = Math.floor(20 * intensity);
        const force = ((blastRadius - dist) / blastRadius) * 6 * intensity;
        const angle = Math.atan2(dy, dx);
        p.vx += Math.cos(angle) * force;
        p.vy += Math.sin(angle) * force;
        p.stuckStartTime = undefined; // Reset stuck timer on explosion blast
      }
    }
  }
}