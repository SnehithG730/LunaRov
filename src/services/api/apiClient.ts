import {
  ApiResponse,
  CloudMissionRecord,
  LeaderboardRecord,
  AiMissionAdviceRequest,
  AiMissionAdviceResponse,
} from '@/types/backend';

export class ApiClient {
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      const data = await res.json();
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network failure';
      return {
        success: false,
        error: message,
      };
    }
  }

  public static async getMissions(params?: {
    isPublic?: boolean;
    search?: string;
    tag?: string;
    sortBy?: 'latest' | 'popular' | 'score';
  }): Promise<ApiResponse<CloudMissionRecord[]>> {
    const query = new URLSearchParams();
    if (params?.isPublic !== undefined) query.set('public', String(params.isPublic));
    if (params?.search) query.set('search', params.search);
    if (params?.tag) query.set('tag', params.tag);
    if (params?.sortBy) query.set('sortBy', params.sortBy);

    const url = `/api/missions${query.toString() ? `?${query.toString()}` : ''}`;
    return this.request<CloudMissionRecord[]>(url);
  }

  public static async getMissionById(id: string): Promise<ApiResponse<CloudMissionRecord>> {
    return this.request<CloudMissionRecord>(`/api/missions/${id}`);
  }

  public static async saveMission(mission: Partial<CloudMissionRecord>): Promise<ApiResponse<CloudMissionRecord>> {
    return this.request<CloudMissionRecord>('/api/missions', {
      method: 'POST',
      body: JSON.stringify(mission),
    });
  }

  public static async updateMission(
    id: string,
    updates: Partial<CloudMissionRecord>
  ): Promise<ApiResponse<CloudMissionRecord>> {
    return this.request<CloudMissionRecord>(`/api/missions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public static async deleteMission(id: string): Promise<ApiResponse<{ id: string; deleted: boolean }>> {
    return this.request<{ id: string; deleted: boolean }>(`/api/missions/${id}`, {
      method: 'DELETE',
    });
  }

  public static async likeMission(id: string): Promise<ApiResponse<{ likes: number }>> {
    return this.request<{ likes: number }>(`/api/missions/${id}/like`, {
      method: 'POST',
    });
  }

  public static async getLeaderboard(params?: {
    algorithm?: string;
    terrainType?: string;
    limit?: number;
  }): Promise<ApiResponse<LeaderboardRecord[]>> {
    const query = new URLSearchParams();
    if (params?.algorithm) query.set('algorithm', params.algorithm);
    if (params?.terrainType) query.set('terrainType', params.terrainType);
    if (params?.limit) query.set('limit', String(params.limit));

    const url = `/api/leaderboard${query.toString() ? `?${query.toString()}` : ''}`;
    return this.request<LeaderboardRecord[]>(url);
  }

  public static async getAiMissionAdvice(
    req: AiMissionAdviceRequest
  ): Promise<ApiResponse<AiMissionAdviceResponse>> {
    return this.request<AiMissionAdviceResponse>('/api/ai/mission-advisor', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }
}
