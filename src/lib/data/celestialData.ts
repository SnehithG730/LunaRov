export interface MoonData {
  id: string;
  name: string;
  tagline: string;
  radiusKm: number;
  massKg: string;
  surfaceGravity: number; // m/s^2
  orbitalPeriodDays: number;
  orbitalDistanceKm: number;
  surfaceTempC: string;
  atmosphere: string;
  surfaceType: 'CRATERED_REGOLITH' | 'ICE_CRUST' | 'VOLCANIC_SULFUR' | 'METHANE_LAKES' | 'CHAOTIC_TERRAIN' | 'NITROGEN_FROST';
  geologicalHighlights: string[];
  historicalMissions: string[];
  scientificDescription: string;
  baseColor: string;
  accentColor: string;
  bumpScale: number;
  roughness: number;
}

export interface PlanetData {
  id: string;
  name: string;
  latinName: string;
  orderFromSun: number;
  distanceFromSunAU: number;
  radiusKm: number;
  orbitalPeriodYears: number;
  color: string;
  accentColor: string;
  description: string;
  atmosphereComposition: string;
  moonsCount: number;
  moons: MoonData[];
}

export const SOLAR_SYSTEM_PLANETS: PlanetData[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    latinName: 'Hermes',
    orderFromSun: 1,
    distanceFromSunAU: 0.39,
    radiusKm: 2439.7,
    orbitalPeriodYears: 0.24,
    color: '#94a3b8',
    accentColor: '#cbd5e1',
    description: 'The smallest and innermost planet in the Solar System. Its heavily cratered, airless basalt surface experiences extreme temperature swings from 430°C in sunlight to -180°C in shadow.',
    atmosphereComposition: 'Trace exosphere: Oxygen (42%), Sodium (29%), Hydrogen (22%), Helium (6%)',
    moonsCount: 0,
    moons: [],
  },
  {
    id: 'venus',
    name: 'Venus',
    latinName: 'Aphrodite',
    orderFromSun: 2,
    distanceFromSunAU: 0.72,
    radiusKm: 6051.8,
    orbitalPeriodYears: 0.62,
    color: '#eab308',
    accentColor: '#fde047',
    description: 'Earth’s twin in size, enveloped by an ultra-dense carbon dioxide atmosphere with sulfuric acid clouds generating an intense runaway greenhouse effect with surface temperatures of 465°C.',
    atmosphereComposition: 'Carbon Dioxide (96.5%), Nitrogen (3.5%), Sulfur Dioxide (150 ppm)',
    moonsCount: 0,
    moons: [],
  },
  {
    id: 'earth',
    name: 'Earth',
    latinName: 'Terra',
    orderFromSun: 3,
    distanceFromSunAU: 1.0,
    radiusKm: 6371.0,
    orbitalPeriodYears: 1.0,
    color: '#0284c7',
    accentColor: '#38bdf8',
    description: 'Our vibrant home world with liquid water oceans, protective magnetic field, active plate tectonics, and a rich nitrogen-oxygen atmosphere teeming with diverse life.',
    atmosphereComposition: 'Nitrogen (78.08%), Oxygen (20.95%), Argon (0.93%), Carbon Dioxide (0.04%)',
    moonsCount: 1,
    moons: [
      {
        id: 'luna',
        name: 'Luna (The Moon)',
        tagline: 'Earth’s Celestial Companion & Prime Exploration Base',
        radiusKm: 1737.4,
        massKg: '7.342 × 10²² kg',
        surfaceGravity: 1.62, // m/s^2 (0.166 g)
        orbitalPeriodDays: 27.3,
        orbitalDistanceKm: 384400,
        surfaceTempC: '-130°C to +120°C',
        atmosphere: 'Extremely tenuous surface boundary exosphere (Helium, Neon, Hydrogen)',
        surfaceType: 'CRATERED_REGOLITH',
        geologicalHighlights: [
          'Dark basaltic lunar maria (volcanic plains formed by ancient lava flows)',
          'Highlands heavily cratered by the Late Heavy Bombardment (~3.9 Ga)',
          'Permanently shadowed polar craters containing billions of tons of water ice',
          'Fine abrasive lunar regolith powder with electrostatic levitation',
        ],
        historicalMissions: [
          'Apollo Program (Apollo 11–17 human landings, 1969–1972)',
          'Luna Program (Soviet robotic sample returns and Lunokhod rovers)',
          'Chang’e 3, 4, 5 (Far side landing and modern sample returns)',
          'Artemis Program & VIPER (Polar ice exploration and sustainable base camp)',
        ],
        scientificDescription: 'Luna is the fifth largest moon in the Solar System and the largest relative to its host planet. Its low gravity, lack of atmospheric shielding, and abundant regolith make it the ultimate proving ground for autonomous autonomous surface mobility systems and pathfinding algorithms.',
        baseColor: '#71717a',
        accentColor: '#38bdf8',
        bumpScale: 1.5,
        roughness: 0.85,
      },
    ],
  },
  {
    id: 'mars',
    name: 'Mars',
    latinName: 'Ares',
    orderFromSun: 4,
    distanceFromSunAU: 1.52,
    radiusKm: 3389.5,
    orbitalPeriodYears: 1.88,
    color: '#ef4444',
    accentColor: '#f97316',
    description: 'The Red Planet, distinguished by oxidized iron-rich basaltic dust, the tallest volcano in the solar system (Olympus Mons), immense canyon networks (Valles Marineris), and water ice polar caps.',
    atmosphereComposition: 'Carbon Dioxide (95.3%), Nitrogen (2.6%), Argon (1.9%), Oxygen (0.16%)',
    moonsCount: 2,
    moons: [
      {
        id: 'phobos',
        name: 'Phobos',
        tagline: 'Doomed Martian Satellite Orbiting Inside the Roche Limit',
        radiusKm: 11.26,
        massKg: '1.0659 × 10¹⁶ kg',
        surfaceGravity: 0.0057, // m/s^2 (Micro-gravity)
        orbitalPeriodDays: 0.318, // 7.66 hours
        orbitalDistanceKm: 9377,
        surfaceTempC: '-112°C to -4°C',
        atmosphere: 'None (Airless micro-gravity body)',
        surfaceType: 'CRATERED_REGOLITH',
        geologicalHighlights: [
          'Stickney Crater: 9 km impact scar dominating nearly half the moon diameter',
          'Parallel linear grooves and fractures caused by tidal stress from Mars',
          'Porous carbonaceous chondrite rubble-pile composition with low density',
        ],
        historicalMissions: [
          'Mariner 9 (First close-up orbital imagery, 1971)',
          'Viking 1 & 2 orbiters (Detailed gravity and volume mapping)',
          'Mars Express & MMX (JAXA sample return mission planned)',
        ],
        scientificDescription: 'Phobos orbits Mars closer than any other moon orbits its primary planet. Orbiting faster than Mars rotates, it rises in the west and sets in the east twice every Martian day. Tidal forces are pulling Phobos closer, expected to break it into a ring in 30–50 million years.',
        baseColor: '#52525b',
        accentColor: '#f97316',
        bumpScale: 2.2,
        roughness: 0.9,
      },
      {
        id: 'deimos',
        name: 'Deimos',
        tagline: 'Outer Miniature Martian Moon Covered in Smooth Regolith Blanket',
        radiusKm: 6.2,
        massKg: '1.4762 × 10¹⁵ kg',
        surfaceGravity: 0.003, // m/s^2
        orbitalPeriodDays: 1.26, // 30.35 hours
        orbitalDistanceKm: 23460,
        surfaceTempC: '-110°C to -10°C',
        atmosphere: 'None',
        surfaceType: 'CRATERED_REGOLITH',
        geologicalHighlights: [
          'Swift and Voltaire impact craters with subdued, smoothed rims',
          'Extremely thick layer of fine regolith (100m+) filling low spots and craters',
          'Rich in organic-rich D-type carbonaceous asteroidal material',
        ],
        historicalMissions: [
          'Viking 2 orbiter (High-resolution flybys, 1977)',
          'Mars Reconnaissance Orbiter (Spectral observations)',
          'Hope Mars Mission (UAE orbiter close flyby revealing non-captured origin)',
        ],
        scientificDescription: 'Deimos has a much smoother appearance than Phobos due to a thick blanket of ejected regolith that has settled across its craters. Its escape velocity is just 5.6 m/s, meaning a running human could achieve escape trajectory.',
        baseColor: '#78716c',
        accentColor: '#ea580c',
        bumpScale: 1.0,
        roughness: 0.8,
      },
    ],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    latinName: 'Zeus',
    orderFromSun: 5,
    distanceFromSunAU: 5.2,
    radiusKm: 69911.0,
    orbitalPeriodYears: 11.86,
    color: '#d97706',
    accentColor: '#fbbf24',
    description: 'The king of planets and largest world in the Solar System. A gas giant with mesmerizing swirling ammonia cloud belts, intense radiation zones, and the iconic centuries-old Great Red Spot storm.',
    atmosphereComposition: 'Hydrogen (89.8%), Helium (10.2%), Methane (0.3%), Ammonia (0.026%)',
    moonsCount: 95,
    moons: [
      {
        id: 'europa',
        name: 'Europa',
        tagline: 'Ocean World with Subsurface Salty Seas Beneath a Floating Ice Shell',
        radiusKm: 1560.8,
        massKg: '4.8 × 10²² kg',
        surfaceGravity: 1.315, // m/s^2 (0.134 g)
        orbitalPeriodDays: 3.55,
        orbitalDistanceKm: 670900,
        surfaceTempC: '-220°C to -160°C',
        atmosphere: 'Tenuous molecular oxygen (O₂) created by radiolysis of surface water ice',
        surfaceType: 'ICE_CRUST',
        geologicalHighlights: [
          'Global fractured ice crust crisscrossed by red-brown lineae and chaos terrain',
          'Subsurface global liquid ocean containing more water than all of Earth combined',
          'Tidal flexing heat generated by 4:2:1 orbital resonance with Io and Ganymede',
          'Active cryovolcanic water vapor geyser plumes erupting into space',
        ],
        historicalMissions: [
          'Galileo Orbiter (Discovered strong induced magnetic field of ocean, 1995–2003)',
          'Voyager 1 & 2 (First clear high-res imagery of fractured ice surface)',
          'Europa Clipper (NASA flagship mission en route to perform 50 close flybys)',
          'JUICE (ESA Jupiter Icy Moons Explorer)',
        ],
        scientificDescription: 'Europa is widely recognized as one of the most promising locations for extraterrestrial habitability in the Solar System. Below its 15–25 km thick ice shell lies an ocean 60–150 km deep in direct contact with a silicate rocky seafloor, enabling hydrothermal chemistry.',
        baseColor: '#e0f2fe',
        accentColor: '#38bdf8',
        bumpScale: 0.8,
        roughness: 0.3,
      },
      {
        id: 'ganymede',
        name: 'Ganymede',
        tagline: 'Largest Moon in the Solar System — Bigger than Mercury',
        radiusKm: 2634.1,
        massKg: '1.4819 × 10²³ kg',
        surfaceGravity: 1.428, // m/s^2 (0.146 g)
        orbitalPeriodDays: 7.15,
        orbitalDistanceKm: 1070400,
        surfaceTempC: '-203°C to -121°C',
        atmosphere: 'Tenuous oxygen exosphere (O, O₂, O₃)',
        surfaceType: 'ICE_CRUST',
        geologicalHighlights: [
          'Only moon in the Solar System known to generate its own intrinsic magnetic dynamo',
          'Dual terrain: Dark heavily cratered ancient regions and bright grooved tectonic bands',
          'Deep multi-layered ocean sandwiched between high-pressure ice phases',
        ],
        historicalMissions: [
          'Pioneer 10 & 11, Voyager 1 & 2',
          'Galileo Orbiter (Mapped magnetosphere and aurorae)',
          'Juno (High-resolution infrared and microwave sounding)',
          'JUICE (Will enter dedicated Ganymede orbit in 2034)',
        ],
        scientificDescription: 'Ganymede is larger than Mercury and dwarf planet Pluto. If it orbited the Sun rather than Jupiter, it would be classified as a planet. Its molten iron core drives a magnetic field that produces auroral belts interacting with Jupiter’s magnetosphere.',
        baseColor: '#a1a1aa',
        accentColor: '#06b6d4',
        bumpScale: 1.3,
        roughness: 0.7,
      },
      {
        id: 'io',
        name: 'Io',
        tagline: 'Most Volcanically Active Celestial Body in the Solar System',
        radiusKm: 1821.6,
        massKg: '8.9319 × 10²² kg',
        surfaceGravity: 1.796, // m/s^2 (0.183 g)
        orbitalPeriodDays: 1.77,
        orbitalDistanceKm: 421700,
        surfaceTempC: '-143°C (Surface average) to 1,600°C (Lava lakes)',
        atmosphere: 'Tenuous Sulfur Dioxide (SO₂), Sodium, Potassium',
        surfaceType: 'VOLCANIC_SULFUR',
        geologicalHighlights: [
          'Over 400 active volcanoes, caldera lakes, and sulfur dioxide geysers',
          'Massive sulfur frost plumes rising up to 500 km above the surface',
          'Loki Patera: Massive 200 km wide magma lake with overturning crust',
          'Constantly resurfaced: Complete lack of impact craters due to rapid lava deposition',
        ],
        historicalMissions: [
          'Voyager 1 (Discovery of active cryovolcanism on Io by Linda Morabito in 1979)',
          'Galileo Orbiter (Measured high-temperature silicate volcanism >1200°C)',
          'New Horizons (Caught spectacular 330km Tvashtar plume eruption on flyby)',
          'Juno (Ultra-close 1,500 km flybys capturing polar thermal maps)',
        ],
        scientificDescription: 'Io is pulled by Jupiter’s immense gravity on one side and its neighboring moons Europa and Ganymede on the other. This intense gravitational tug-of-war generates massive tidal friction that melts its interior into a churning magma mantle, driving constant super-volcanism.',
        baseColor: '#eab308',
        accentColor: '#f97316',
        bumpScale: 1.8,
        roughness: 0.6,
      },
      {
        id: 'callisto',
        name: 'Callisto',
        tagline: 'Heavily Cratered Ancient Ice World with Lowest Radiation Exposure',
        radiusKm: 2410.3,
        massKg: '1.0759 × 10²³ kg',
        surfaceGravity: 1.235, // m/s^2 (0.126 g)
        orbitalPeriodDays: 16.69,
        orbitalDistanceKm: 1882700,
        surfaceTempC: '-193°C to -108°C',
        atmosphere: 'Very thin Carbon Dioxide (CO₂) and Oxygen exosphere',
        surfaceType: 'CRATERED_REGOLITH',
        geologicalHighlights: [
          'Most heavily cratered surface in the Solar System — saturation limit reached',
          'Valhalla Basin: Gigantic multi-ring impact structure spanning 3,800 km',
          'Low radiation environment outside Jupiter’s lethal inner magnetosphere belt',
        ],
        historicalMissions: [
          'Voyager 1 & 2',
          'Galileo (Mapped ancient crust and subsurface electrical conductivity)',
          'JUICE (Will perform multiple gravity-assist flybys)',
        ],
        scientificDescription: 'Callisto’s ancient surface is a geological snapshot of the early Solar System. Because it orbits far outside Jupiter’s harsh radiation belt, Callisto is considered the safest and most practical staging hub for future human exploration of the Jovian system.',
        baseColor: '#64748b',
        accentColor: '#0ea5e9',
        bumpScale: 1.9,
        roughness: 0.88,
      },
    ],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    latinName: 'Kronos',
    orderFromSun: 6,
    distanceFromSunAU: 9.58,
    radiusKm: 58232.0,
    orbitalPeriodYears: 29.45,
    color: '#e2b34a',
    accentColor: '#fef08a',
    description: 'The jewel of the solar system, surrounded by thousands of shimmering ice rings with intricate gravitational shepherd moonlets and a unique hexagonal jet stream at its north pole.',
    atmosphereComposition: 'Hydrogen (96.3%), Helium (3.25%), Methane (0.45%), Ammonia (0.01%)',
    moonsCount: 146,
    moons: [
      {
        id: 'titan',
        name: 'Titan',
        tagline: 'Dense Atmosphere & Liquid Methane Seas — Earth-like Prebiotic World',
        radiusKm: 2574.7,
        massKg: '1.3452 × 10²³ kg',
        surfaceGravity: 1.352, // m/s^2 (0.138 g)
        orbitalPeriodDays: 15.94,
        orbitalDistanceKm: 1221870,
        surfaceTempC: '-179.5°C',
        atmosphere: 'Dense Nitrogen (98.4%), Methane (1.4%), Hydrogen (0.2%) — 1.5 bar surface pressure',
        surfaceType: 'METHANE_LAKES',
        geologicalHighlights: [
          'Liquid hydrocarbon lakes & seas: Kraken Mare, Ligeia Mare, and Punga Mare',
          'Active methane hydrological cycle: Clouds, rain, rivers, and seasonal lake evaporation',
          'Vast equatorial organic sand dune fields (Shangri-La and Belet)',
          'Atmospheric pressure 50% higher than Earth’s, enabling winged flight for rovers',
        ],
        historicalMissions: [
          'Voyager 1 (First discovery of opaque nitrogen-methane smog)',
          'Cassini-Huygens (Huygens probe landed on Titan’s surface in Jan 2005)',
          'Dragonfly (NASA mission launching in 2028: Autonomous dual-quadcopter rotorcraft)',
        ],
        scientificDescription: 'Titan is the only moon in the Solar System with a dense atmosphere and the only celestial body other than Earth with stable surface liquids. Its rich organic chemistry makes it a giant natural laboratory for studying the prebiotic conditions that led to life on early Earth.',
        baseColor: '#d97706',
        accentColor: '#fbbf24',
        bumpScale: 0.9,
        roughness: 0.45,
      },
      {
        id: 'enceladus',
        name: 'Enceladus',
        tagline: 'Cryovolcanic Ice Moon Spraying Subsurface Ocean Plumes into Orbit',
        radiusKm: 252.1,
        massKg: '1.08 × 10²⁰ kg',
        surfaceGravity: 0.113, // m/s^2 (0.011 g)
        orbitalPeriodDays: 1.37,
        orbitalDistanceKm: 238000,
        surfaceTempC: '-201°C',
        atmosphere: 'Water vapor, Molecular Nitrogen, Carbon Dioxide, Methane',
        surfaceType: 'ICE_CRUST',
        geologicalHighlights: [
          'South Polar "Tiger Stripes" (Damascus, Baghdad, Alexandria, Cairo sulci)',
          'Over 100 active hydrothermal geysers venting ocean water into Saturn’s E-ring',
          'Highest albedo (reflectivity > 99%) in the Solar System — pure fresh water ice',
          'Detection of molecular hydrogen (H₂), phosphates, and organic macromolecular compounds',
        ],
        historicalMissions: [
          'Voyager 1 & 2',
          'Cassini Orbiter (Flew directly through the geyser plumes, sampling ocean chemistry)',
        ],
        scientificDescription: 'Enceladus harbors a global subsurface liquid ocean heated by hydrothermal vents at its rocky core. Water geysers erupt continuously from tiger-stripe fractures at its south pole, making it possible to sample a habitable alien ocean without drilling through the ice.',
        baseColor: '#f8fafc',
        accentColor: '#38bdf8',
        bumpScale: 0.5,
        roughness: 0.2,
      },
      {
        id: 'mimas',
        name: 'Mimas',
        tagline: 'The "Death Star" Moon with a Colossal 130 km Herschel Impact Crater',
        radiusKm: 198.2,
        massKg: '3.75 × 10¹⁹ kg',
        surfaceGravity: 0.064, // m/s^2
        orbitalPeriodDays: 0.94,
        orbitalDistanceKm: 185520,
        surfaceTempC: '-209°C',
        atmosphere: 'None',
        surfaceType: 'CRATERED_REGOLITH',
        geologicalHighlights: [
          'Herschel Crater: 130 km wide (1/3 of Mimas diameter) with 6 km high central peak',
          'Libration measurements suggest a hidden subsurface ocean 20–30 km below ice',
          'Heavily cratered surface composed almost entirely of water ice',
        ],
        historicalMissions: [
          'Pioneer 11, Voyager 1 & 2',
          'Cassini Orbiter (High-resolution thermal Pac-Man anomaly maps)',
        ],
        scientificDescription: 'Mimas is famous for its striking resemblance to the fictional Death Star due to the massive Herschel crater. Despite its heavily cratered, seemingly dead exterior, recent rotational libration data indicates it likely possesses a young internal ocean.',
        baseColor: '#94a3b8',
        accentColor: '#cbd5e1',
        bumpScale: 2.5,
        roughness: 0.85,
      },
    ],
  },
  {
    id: 'uranus',
    name: 'Uranus',
    latinName: 'Caelus',
    orderFromSun: 7,
    distanceFromSunAU: 19.2,
    radiusKm: 25362.0,
    orbitalPeriodYears: 84.01,
    color: '#06b6d4',
    accentColor: '#67e8f9',
    description: 'An ice giant tipped on its side with an axial tilt of 98°, rotating almost horizontally. Composed of water, ammonia, and methane ices with a pale aquamarine hue.',
    atmosphereComposition: 'Hydrogen (83%), Helium (15%), Methane (2.3%)',
    moonsCount: 28,
    moons: [
      {
        id: 'miranda',
        name: 'Miranda',
        tagline: 'Extreme Frankenstein World with Verona Rupes: 20 km Vertical Cliffs',
        radiusKm: 235.8,
        massKg: '6.59 × 10¹⁹ kg',
        surfaceGravity: 0.079, // m/s^2
        orbitalPeriodDays: 1.41,
        orbitalDistanceKm: 129900,
        surfaceTempC: '-213°C',
        atmosphere: 'None',
        surfaceType: 'CHAOTIC_TERRAIN',
        geologicalHighlights: [
          'Verona Rupes: Tallest known cliff in the Solar System (estimated 20 km drop)',
          'Coronae: Huge ovoid tectonic fault zones (Inverness, Arden, and Elsinore)',
          'Chaotic jumble of ancient heavily cratered crust and young extensional fault grabens',
        ],
        historicalMissions: [
          'Voyager 2 (Close flyby in January 1986 — only spacecraft to visit)',
        ],
        scientificDescription: 'Miranda has one of the most bizarre and varied terrains in the Solar System. Its cliff Verona Rupes is so tall that in Miranda’s low gravity, an dropped rock would take over 12 minutes to hit the bottom.',
        baseColor: '#a8a29e',
        accentColor: '#22d3ee',
        bumpScale: 2.8,
        roughness: 0.8,
      },
      {
        id: 'titania',
        name: 'Titania',
        tagline: 'Largest Moon of Uranus with Massive Rift Valleys and Canyons',
        radiusKm: 788.4,
        massKg: '3.4 × 10²¹ kg',
        surfaceGravity: 0.367, // m/s^2
        orbitalPeriodDays: 8.71,
        orbitalDistanceKm: 436300,
        surfaceTempC: '-203°C to -193°C',
        atmosphere: 'Tenuous carbon dioxide (CO₂) atmosphere detected in 2001',
        surfaceType: 'ICE_CRUST',
        geologicalHighlights: [
          'Messina Chasma: Immense 1,500 km long fault canyon system',
          'Porous water ice crust mixed with organic carbonaceous tholins',
          'Possible internal liquid water layer at the mantle-core boundary',
        ],
        historicalMissions: [
          'Voyager 2 (January 1986 flyby)',
        ],
        scientificDescription: 'Titania is the largest Uranian satellite and the eighth largest moon in the Solar System. Its surface is cut by a vast network of fault scarps and grabens resulting from deep crustal expansion as its subsurface ocean froze.',
        baseColor: '#78716c',
        accentColor: '#38bdf8',
        bumpScale: 1.4,
        roughness: 0.75,
      },
    ],
  },
  {
    id: 'neptune',
    name: 'Neptune',
    latinName: 'Poseidon',
    orderFromSun: 8,
    distanceFromSunAU: 30.05,
    radiusKm: 24622.0,
    orbitalPeriodYears: 164.8,
    color: '#2563eb',
    accentColor: '#60a5fa',
    description: 'The outermost major planet, a deep cobalt blue ice giant with supersonic winds reaching 2,100 km/h, violent dark vortex storms, and high-altitude cirrus methane ice clouds.',
    atmosphereComposition: 'Hydrogen (80%), Helium (19%), Methane (1.5%)',
    moonsCount: 16,
    moons: [
      {
        id: 'triton',
        name: 'Triton',
        tagline: 'Captured Kuiper Belt World with Active Liquid Nitrogen Cryovolcanoes',
        radiusKm: 1353.4,
        massKg: '2.14 × 10²² kg',
        surfaceGravity: 0.779, // m/s^2 (0.079 g)
        orbitalPeriodDays: -5.88, // Retrograde orbit
        orbitalDistanceKm: 354760,
        surfaceTempC: '-235°C (Coldest measured surface in the Solar System)',
        atmosphere: 'Tenuous Nitrogen (99.9%) and Methane (14 microbars surface pressure)',
        surfaceType: 'NITROGEN_FROST',
        geologicalHighlights: [
          'Active nitrogen geysers spraying plumes of dark organic dust 8 km high',
          '"Cantaloupe terrain": Unique dimpled, crustal terrain resembling melon skin',
          'Retrograde orbit: Only large moon in the Solar System orbiting opposite its planet’s rotation',
          'Captured Kuiper Belt dwarf planet closely related to Pluto',
        ],
        historicalMissions: [
          'Voyager 2 (Historic August 1989 flyby revealing geysers and cantaloupe terrain)',
        ],
        scientificDescription: 'Triton is a frozen geological wonder. As a captured dwarf planet from the Kuiper Belt, tidal forces melted its interior, creating an active cryovolcanic world where liquid nitrogen erupts under solar heating into an ultra-cold surface of -235°C.',
        baseColor: '#bae6fd',
        accentColor: '#3b82f6',
        bumpScale: 1.2,
        roughness: 0.4,
      },
    ],
  },
];
