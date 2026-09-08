import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/backend/db';
import { ApiResponse, CloudMissionRecord } from '@/types/backend';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const mission = dbService.getMissionById(id);

    if (!mission) {
      return NextResponse.json(
        { success: false, error: 'Mission not found' },
        { status: 404 }
      );
    }

    const response: ApiResponse<CloudMissionRecord> = {
      success: true,
      data: mission,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to retrieve mission: ${message}` },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const updated = dbService.updateMission(id, body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Mission not found' },
        { status: 404 }
      );
    }

    const response: ApiResponse<CloudMissionRecord> = {
      success: true,
      data: updated,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to update mission: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const success = dbService.deleteMission(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Mission not found' },
        { status: 404 }
      );
    }

    const response: ApiResponse<{ id: string; deleted: boolean }> = {
      success: true,
      data: { id, deleted: true },
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to delete mission: ${message}` },
      { status: 500 }
    );
  }
}
