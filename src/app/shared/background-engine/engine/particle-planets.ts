// Planet manager handling prominent elliptical orbits, collision-free spacing, and larger, slower orbiting moons.
import { Planet, Moon } from './particle.model';

export class ParticlePlanets {
  private readonly colorPalette = [
    '0, 229, 255',   // Glowing Cyan
    '143, 174, 197', // Slate Blue
    '160, 180, 200', // Cool Gray
    '40, 60, 85',    // Dark Navy
    '20, 30, 45'     // Deep Charcoal / Black
  ];

  public generatePlanets(count: number, width: number, height: number): Planet[] {
    const planets: Planet[] = [];
    const minDimension = Math.min(width, height);
    const minOrbit = minDimension * 0.18;
    const maxOrbit = minDimension * 0.45;
    const bandStep = (maxOrbit - minOrbit) / Math.max(1, count);

    for (let i = 0; i < count; i++) {
      const baseDistance = minOrbit + i * bandStep + bandStep * 0.5;
      const orbitRadiusX = baseDistance + (Math.random() - 0.5) * (bandStep * 0.3);
      const orbitRadiusY = orbitRadiusX * (0.4 + Math.random() * 0.3);

      const radius = 22 + Math.random() * 18; // Large planet nodes
      const mass = radius * 1.8;

      const moonCount = Math.floor(Math.random() * 2) + 1;
      const moons: Moon[] = [];
      let lastMoonOrbit = radius * 1.8;

      for (let m = 0; m < moonCount; m++) {
        const moonOrbitRadius = lastMoonOrbit + 16 + Math.random() * 12;
        lastMoonOrbit = moonOrbitRadius;

        moons.push({
          id: m + 1,
          orbitRadius: moonOrbitRadius,
          angle: Math.random() * Math.PI * 2,
          // Slower, more majestic moon speeds
          speed: (0.005 + Math.random() * 0.01) * (Math.random() < 0.5 ? 1 : -1),
          radius: 4.5 + Math.random() * 2.5, // Slightly larger moons
          x: 0,
          y: 0
        });
      }

      planets.push({
        id: i + 1,
        orbitRadiusX,
        orbitRadiusY,
        angle: Math.random() * Math.PI * 2,
        speed: (0.001 + Math.random() * 0.002) * (Math.random() < 0.5 ? 1 : -1),
        radius,
        mass,
        color: this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)],
        moons,
        x: 0,
        y: 0
      });
    }

    return planets;
  }

  public updatePlanets(planets: Planet[], width: number, height: number, speedMultiplier: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    for (const planet of planets) {
      planet.angle += planet.speed * speedMultiplier;
      planet.x = centerX + Math.cos(planet.angle) * planet.orbitRadiusX;
      planet.y = centerY + Math.sin(planet.angle) * planet.orbitRadiusY;

      for (const moon of planet.moons) {
        moon.angle += moon.speed * speedMultiplier;
        moon.x = planet.x + Math.cos(moon.angle) * moon.orbitRadius;
        moon.y = planet.y + Math.sin(moon.angle) * moon.orbitRadius;
      }
    }
  }
}