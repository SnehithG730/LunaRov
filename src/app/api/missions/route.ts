import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/backend/db';
import { ApiResponse, CloudMissionRecord } from '@/types/backend';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isPublic = searchParams.has('public') ? searchParams.get('public') === 'true' : undefined;
    const search = searchParams.get('search') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const sortBy = (searchParams.get('sortBy') as 'latest' | 'popular' | 'score') || 'latest';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { items, total } = dbService.getMissions({
      isPublic,
      search,
      tag,
      sortBy,
      limit,
      offset,
    });

    const response: ApiResponse<CloudMissionRecord[]> = {
      success: true,
      data: items,
      meta: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
      },
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to fetch missions: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.terrainType || !body.start || !body.target) {
      return NextResponse.json(
        { success: false, error: 'Missing required mission parameters (name, terrainType, start, target)' },
        { status: 400 }
      );
    }

    const created = dbService.createMission(body);

    const response: ApiResponse<CloudMissionRecord> = {
      success: true,
      data: created,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to create mission: ${message}` },
      { status: 500 }
    );
  }
}
