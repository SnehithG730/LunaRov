import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/backend/db';
import { ApiResponse, LeaderboardRecord } from '@/types/backend';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const algorithm = searchParams.get('algorithm') || undefined;
    const terrainType = searchParams.get('terrainType') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const entries = dbService.getLeaderboard({
      algorithm,
      terrainType,
      limit,
    });

    const response: ApiResponse<LeaderboardRecord[]> = {
      success: true,
      data: entries,
      meta: {
        total: entries.length,
        limit,
      },
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to fetch leaderboard: ${message}` },
      { status: 500 }
    );
  }
}
