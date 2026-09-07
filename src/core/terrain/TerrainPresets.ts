import { TerrainType } from '@/types/terrain';

export interface TerrainPresetMeta {
  id: TerrainType;
  name: string;
  description: string;
  lunarAnalogue: string;
  averageSlope: string;
  traversabilityRating: 'EASY' | 'MODERATE' | 'DIFFICULT' | 'EXTREME';
  recommendedRoverSpeed: string;
}

export const TERRAIN_PRESETS: Record<TerrainType, TerrainPresetMeta> = {
  FLAT: {
    id: 'FLAT',
    name: 'Mare Plains',
    description: 'Smooth basaltic plains with gentle undulating regolith and minimal slope hazards.',
    lunarAnalogue: 'Mare Tranquillitatis (Apollo 11 Landing Site)',
    averageSlope: '2° - 5°',
    traversabilityRating: 'EASY',
    recommendedRoverSpeed: '2.0 m/s',
  },
  CRATER_FIELD: {
    id: 'CRATER_FIELD',
    name: 'Crater Basin Field',
    description: 'Clustered impact craters with elevated rims and steep interior depression walls requiring path circumnavigation.',
    lunarAnalogue: 'Fra Mauro Highlands (Apollo 14 Site)',
    averageSlope: '8° - 22°',
    traversabilityRating: 'DIFFICULT',
    recommendedRoverSpeed: '1.2 m/s',
  },
  ROCKY: {
    id: 'ROCKY',
    name: 'Rocky Regolith Field',
    description: 'Scattered impact ejecta boulders and high-friction rocky regolith requiring agile obstacle avoidance.',
    lunarAnalogue: 'Oceanus Procellarum / Copernicus Ejecta',
    averageSlope: '6° - 16°',
    traversabilityRating: 'MODERATE',
    recommendedRoverSpeed: '1.0 m/s',
  },
  HILLY: {
    id: 'HILLY',
    name: 'Rolling Highland Ridges',
    description: 'Broad rolling hills and massif shoulders presenting high elevation gain and battery incline drain.',
    lunarAnalogue: 'Descartes Highlands (Apollo 16 Site)',
    averageSlope: '12° - 24°',
    traversabilityRating: 'DIFFICULT',
    recommendedRoverSpeed: '1.4 m/s',
  },
  SOUTH_POLE: {
    id: 'SOUTH_POLE',
    name: 'Lunar South Pole Rim',
    description: 'Severe topographic gradients, deep permanently shadowed craters (PSRs), steep rim walls, and extreme mobility risks.',
    lunarAnalogue: 'Shackleton Crater Rim / Artemis Landing Zone',
    averageSlope: '15° - 32°',
    traversabilityRating: 'EXTREME',
    recommendedRoverSpeed: '0.8 m/s',
  },
  CUSTOM: {
    id: 'CUSTOM',
    name: 'Custom User Sector',
    description: 'Interactive sector allowing real-time editing of elevation and manual placement of craters and hazards.',
    lunarAnalogue: 'Synthetic Testing Ground',
    averageSlope: 'Variable',
    traversabilityRating: 'MODERATE',
    recommendedRoverSpeed: '1.5 m/s',
  },
};
