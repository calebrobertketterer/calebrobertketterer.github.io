// Physics engine class handling particle movement, orbital velocities, mouse gravity attraction, planet/moon gravity, and explosions.
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

    for (const p of particles) {
      p.orbitalAngle += p.orbitalSpeed * 0.01 * speedMultiplier;

      const targetX = isMouseActive ? mouseX : centerX;
      const targetY = isMouseActive ? mouseY : centerY;

      const dxTarget = targetX - p.x;
      const dyTarget = targetY - p.y;
      const distTarget = Math.sqrt(dxTarget * dxTarget + dyTarget * dyTarget);

      // Apply base accelerations without double-scaling
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

      // Apply unidirectional gravitational pull from planets AND their moons
      for (const planet of planets) {
        // Planet gravity well
        const dxPlanet = planet.x - p.x;
        const dyPlanet = planet.y - p.y;
        const distPlanet = Math.sqrt(dxPlanet * dxPlanet + dyPlanet * dyPlanet);
        const gravityRadius = planet.radius * 7;

        if (distPlanet < gravityRadius && distPlanet > planet.radius) {
          const pullStrength = ((gravityRadius - distPlanet) / gravityRadius) * (planet.mass * 0.007);
          p.vx += (dxPlanet / distPlanet) * pullStrength;
          p.vy += (dyPlanet / distPlanet) * pullStrength;
        }

        // Moon gravity wells (unaffected by particles)
        for (const moon of planet.moons) {
          const dxMoon = moon.x - p.x;
          const dyMoon = moon.y - p.y;
          const distMoon = Math.sqrt(dxMoon * dxMoon + dyMoon * dyMoon);
          const moonGravityRadius = moon.radius * 6;

          if (distMoon < moonGravityRadius && distMoon > moon.radius) {
            const moonPull = ((moonGravityRadius - distMoon) / moonGravityRadius) * 0.04;
            p.vx += (dxMoon / distMoon) * moonPull;
            p.vy += (dyMoon / distMoon) * moonPull;
          }
        }
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
      }
    }
  }
}