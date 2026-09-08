import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/backend/db';
import { ApiResponse } from '@/types/backend';

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const result = dbService.likeMission(id);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Mission not found' },
        { status: 404 }
      );
    }

    const response: ApiResponse<{ likes: number }> = {
      success: true,
      data: result,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to like mission: ${message}` },
      { status: 500 }
    );
  }
}
