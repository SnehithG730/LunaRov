import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, AiMissionAdviceRequest, AiMissionAdviceResponse } from '@/types/backend';
import { AlgorithmType } from '@/types/pathfinding';

export async function POST(request: NextRequest) {
  try {
    const body: AiMissionAdviceRequest = await request.json();

    const { terrainType, start, target, obstacleCount } = body;

    const dx = Math.abs((target?.x || 0) - (start?.x || 0));
    const dy = Math.abs((target?.y || 0) - (start?.y || 0));
    const euclideanDist = Math.sqrt(dx * dx + dy * dy);

    let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
    let recommendedAlgorithm: AlgorithmType = 'ASTAR';
    let successRate = 95;

    if (terrainType === 'SOUTH_POLE' || terrainType === 'HILLY') {
      riskLevel = obstacleCount > 15 ? 'CRITICAL' : 'HIGH';
      recommendedAlgorithm = 'ASTAR';
      successRate = obstacleCount > 15 ? 78 : 86;
    } else if (terrainType === 'CRATER_FIELD' || terrainType === 'ROCKY') {
      riskLevel = obstacleCount > 10 ? 'HIGH' : 'MODERATE';
      recommendedAlgorithm = 'DIJKSTRA';
      successRate = 89;
    } else {
      riskLevel = obstacleCount > 20 ? 'MODERATE' : 'LOW';
      recommendedAlgorithm = euclideanDist > 40 ? 'ASTAR' : 'GREEDY_BFS';
      successRate = 98;
    }

    const tacticalRecommendations: string[] = [
      `Maintain optimal sensor sweep rate: detected ${obstacleCount} potential obstacle vectors.`,
      `Estimated direct geodesic displacement is ${euclideanDist.toFixed(1)} grid units across ${terrainType.replace('_', ' ')} terrain.`,
      recommendedAlgorithm === 'ASTAR'
        ? 'A* heuristic optimization is strongly advised to balance node expansion with battery conservation.'
        : recommendedAlgorithm === 'DIJKSTRA'
        ? 'Dijkstra uniform-cost search is recommended due to dense crater depressions.'
        : 'Greedy Best-First Search provides lowest computational latency on open regolith plains.',
      'Deploy conservative speed limits on grades exceeding 15° to prevent wheel slip and power surges.',
    ];

    const responseData: AiMissionAdviceResponse = {
      riskLevel,
      recommendedAlgorithm,
      strategicBriefing: `Autonomous AI Mission Assessment for ${terrainType.replace('_', ' ')}: Path profile indicates ${riskLevel} operational risk. Sensor radar detected ${obstacleCount} regional hazards.`,
      tacticalRecommendations,
      energyProfileAdvice: `Anticipated baseline energy draw: ~${(euclideanDist * 3.8).toFixed(0)} Wh. Reserve at least 20% margin for dynamic reroutes around unexplored crater rims.`,
      estimatedSuccessRatePct: successRate,
    };

    const response: ApiResponse<AiMissionAdviceResponse> = {
      success: true,
      data: responseData,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `AI Advisor failed: ${message}` },
      { status: 500 }
    );
  }
}
