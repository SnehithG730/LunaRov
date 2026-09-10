import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

// Default Supabase configuration from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_4IZL0z272_LWVV4OGdppUQ_LQ-vz0gG';

// Check if valid cloud URL is present (not a placeholder)
export const isCloudSupabaseConfigured = (): boolean => {
  return (
    Boolean(SUPABASE_URL) &&
    !SUPABASE_URL.includes('your-project-ref') &&
    SUPABASE_URL.startsWith('https://')
  );
};

// Initialize Supabase Client
export const supabase: SupabaseClient | null = isCloudSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// ============================================================================
// DATA MODELS & TYPES
// ============================================================================
export interface AstronautProfile {
  id: string;
  email: string;
  fullName: string;
  avatarSeed: string;
  role: string;
  missionsCompleted: number;
  lastLogin?: number;
}

export interface StoredCredentialRecord {
  email: string;
  fullName: string;
  passwordHash: string;
  salt: string;
  avatarSeed: string;
  createdAt: number;
  lastLogin: number;
}

export interface AuthResult {
  success: boolean;
  user?: AstronautProfile;
  error?: string;
}

const LOCAL_CREDENTIALS_KEY = 'lunarov_auth_vault_v1';

// ============================================================================
// CRYPTOGRAPHIC PASSWORD HASHING (Web Crypto API SHA-256)
// ============================================================================
async function hashPassword(password: string, salt: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return btoa(password + salt);
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
  if (typeof window === 'undefined' || !window.crypto) {
    return Math.random().toString(36).substring(2, 15);
  }
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('');
}

let memoryVaultFallback: Record<string, StoredCredentialRecord> = {};

function getStoredVault(): Record<string, StoredCredentialRecord> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(LOCAL_CREDENTIALS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
  }
  return { ...memoryVaultFallback };
}

function saveStoredVault(vault: Record<string, StoredCredentialRecord>): void {
  memoryVaultFallback = { ...vault };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LOCAL_CREDENTIALS_KEY, JSON.stringify(vault));
    } catch (err) {
      console.warn('Failed to persist auth vault:', err);
    }
  }
}

// ============================================================================
// SENIOR DBA AUTH SERVICE
// ============================================================================
export class SupabaseAuthService {
  /**
   * Registers a new astronaut account or verifies an existing one with strict password validation.
   */
  public static async registerUser(
    fullName: string,
    email: string,
    password: string
  ): Promise<AuthResult> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim() || cleanEmail.split('@')[0];

    // 1. Check if user already exists in vault
    const vault = getStoredVault();
    if (vault[cleanEmail]) {
      // User exists, verify password
      return this.authenticateUser(cleanEmail, password);
    }

    // 2. Cloud Supabase Sign Up if configured
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { full_name: cleanName },
          },
        });

        if (error && !error.message.toLowerCase().includes('already registered')) {
          console.warn('Supabase cloud signup notice:', error.message);
        } else if (data?.user) {
          // Cloud registration succeeded
          const profile: AstronautProfile = {
            id: data.user.id,
            email: cleanEmail,
            fullName: cleanName,
            avatarSeed: cleanName.toLowerCase(),
            role: 'MISSION_COMMANDER',
            missionsCompleted: 0,
            lastLogin: Date.now(),
          };

          // Also save in local vault for seamless fallback
          const salt = generateSalt();
          const hash = await hashPassword(password, salt);
          vault[cleanEmail] = {
            email: cleanEmail,
            fullName: cleanName,
            passwordHash: hash,
            salt,
            avatarSeed: cleanName.toLowerCase(),
            createdAt: Date.now(),
            lastLogin: Date.now(),
          };
          saveStoredVault(vault);

          return { success: true, user: profile };
        }
      } catch (err) {
        console.warn('Cloud signup error, using resilient vault:', err);
      }
    }

    // 3. Local cryptographic vault registration
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    const newRecord: StoredCredentialRecord = {
      email: cleanEmail,
      fullName: cleanName,
      passwordHash: hash,
      salt,
      avatarSeed: cleanName.toLowerCase(),
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };

    vault[cleanEmail] = newRecord;
    saveStoredVault(vault);

    return {
      success: true,
      user: {
        id: `ast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        email: cleanEmail,
        fullName: cleanName,
        avatarSeed: cleanName.toLowerCase(),
        role: 'MISSION_COMMANDER',
        missionsCompleted: 0,
        lastLogin: Date.now(),
      },
    };
  }

  /**
   * Authenticates an astronaut with their specified email and password.
   * Strictly verifies password: if the account already exists, the password MUST match!
   */
  public static async authenticateUser(
    email: string,
    password: string
  ): Promise<AuthResult> {
    const cleanEmail = email.trim().toLowerCase();
    const vault = getStoredVault();

    // 1. Cloud Supabase verification if active
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!error && data?.user) {
          const profile: AstronautProfile = {
            id: data.user.id,
            email: cleanEmail,
            fullName: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
            avatarSeed: cleanEmail.split('@')[0],
            role: 'MISSION_COMMANDER',
            missionsCompleted: 0,
            lastLogin: Date.now(),
          };

          // Synchronize vault
          const salt = generateSalt();
          const hash = await hashPassword(password, salt);
          vault[cleanEmail] = {
            email: cleanEmail,
            fullName: profile.fullName,
            passwordHash: hash,
            salt,
            avatarSeed: profile.avatarSeed,
            createdAt: Date.now(),
            lastLogin: Date.now(),
          };
          saveStoredVault(vault);

          return { success: true, user: profile };
        } else if (error && error.message.includes('Invalid login credentials')) {
          return {
            success: false,
            error: 'ACCESS DENIED: The password entered is incorrect for this astronaut email.',
          };
        }
      } catch (err) {
        console.warn('Supabase cloud authentication check failed, using vault:', err);
      }
    }

    // 2. Vault password verification
    const existing = vault[cleanEmail];
    if (!existing) {
      // First-time user logging in: auto-register and save password
      const salt = generateSalt();
      const hash = await hashPassword(password, salt);
      const name = cleanEmail.split('@')[0];
      const newRecord: StoredCredentialRecord = {
        email: cleanEmail,
        fullName: name,
        passwordHash: hash,
        salt,
        avatarSeed: name,
        createdAt: Date.now(),
        lastLogin: Date.now(),
      };
      vault[cleanEmail] = newRecord;
      saveStoredVault(vault);

      return {
        success: true,
        user: {
          id: `ast-${Date.now()}`,
          email: cleanEmail,
          fullName: name,
          avatarSeed: name,
          role: 'MISSION_COMMANDER',
          missionsCompleted: 0,
          lastLogin: Date.now(),
        },
      };
    }

    // Verify existing password against cryptographic hash
    const computedHash = await hashPassword(password, existing.salt);
    if (computedHash !== existing.passwordHash) {
      return {
        success: false,
        error: 'ACCESS DENIED: The password entered does not match the password registered for this astronaut email.',
      };
    }

    // Password valid! Update last login
    existing.lastLogin = Date.now();
    saveStoredVault(vault);

    return {
      success: true,
      user: {
        id: `ast-${cleanEmail}`,
        email: cleanEmail,
        fullName: existing.fullName,
        avatarSeed: existing.avatarSeed,
        role: 'MISSION_COMMANDER',
        missionsCompleted: 0,
        lastLogin: existing.lastLogin,
      },
    };
  }

  /**
   * Logs out the current user and clears session state.
   */
  public static async logout(): Promise<void> {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Error signing out of Supabase cloud:', err);
      }
    }
  }

  /**
   * Checks if an email is already registered in the system.
   */
  public static isEmailRegistered(email: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    const vault = getStoredVault();
    return Boolean(vault[cleanEmail]);
  }
}

// ============================================================================
// SENIOR DBA MISSION DATA PERSISTENCE
// ============================================================================
export interface DatabaseMissionRecord {
  id: string;
  name: string;
  date: string;
  terrainType: string;
  algorithm: string;
  start: { x: number; y: number };
  target: { x: number; y: number };
  roverName: string;
  durationSeconds: number;
  distanceMeters: number;
  energyConsumedWh: number;
  efficiencyScore: number;
  outcome: string;
  averageSpeedMps?: number;
  maxSlopeDeg?: number;
  rerouteCount?: number;
  createdAt?: string;
}

const MISSIONS_STORAGE_KEY = 'lunarov_database_missions_v1';

export class SupabaseDatabaseService {
  /**
   * Persists completed mission log to Supabase PostgreSQL and local synchronized store.
   */
  public static async saveMission(
    userEmail: string,
    mission: DatabaseMissionRecord
  ): Promise<boolean> {
    // 1. Cloud Supabase Insert if available
    if (supabase) {
      try {
        const { error } = await supabase.from('saved_missions').upsert({
          id: mission.id,
          user_email: userEmail,
          name: mission.name,
          date: mission.date,
          terrain_type: mission.terrainType,
          algorithm: mission.algorithm,
          start_x: mission.start.x,
          start_y: mission.start.y,
          target_x: mission.target.x,
          target_y: mission.target.y,
          rover_name: mission.roverName,
          duration_seconds: mission.durationSeconds,
          distance_meters: mission.distanceMeters,
          energy_consumed_wh: mission.energyConsumedWh,
          efficiency_score: mission.efficiencyScore,
          outcome: mission.outcome,
          average_speed_mps: mission.averageSpeedMps ?? 0,
          max_slope_deg: mission.maxSlopeDeg ?? 0,
          reroute_count: mission.rerouteCount ?? 0,
        });

        if (!error) return true;
        console.warn('Supabase cloud mission upsert warning:', error.message);
      } catch (err) {
        console.warn('Error saving mission to Supabase cloud:', err);
      }
    }

    // 2. Synchronized database storage fallback
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(MISSIONS_STORAGE_KEY);
        const list: DatabaseMissionRecord[] = raw ? JSON.parse(raw) : [];
        const existingIdx = list.findIndex((m) => m.id === mission.id);
        if (existingIdx >= 0) {
          list[existingIdx] = mission;
        } else {
          list.unshift(mission);
        }
        localStorage.setItem(MISSIONS_STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
        return true;
      } catch (err) {
        console.warn('Failed to persist mission locally:', err);
      }
    }

    return false;
  }

  /**
   * Retrieves all saved missions for the current user.
   */
  public static async getMissions(userEmail?: string): Promise<DatabaseMissionRecord[]> {
    if (supabase && userEmail) {
      try {
        const { data, error } = await supabase
          .from('saved_missions')
          .select('*')
          .eq('user_email', userEmail)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((row) => ({
            id: row.id,
            name: row.name,
            date: row.date,
            terrainType: row.terrain_type,
            algorithm: row.algorithm,
            start: { x: row.start_x, y: row.start_y },
            target: { x: row.target_x, y: row.target_y },
            roverName: row.rover_name,
            durationSeconds: Number(row.duration_seconds),
            distanceMeters: Number(row.distance_meters),
            energyConsumedWh: Number(row.energy_consumed_wh),
            efficiencyScore: row.efficiency_score,
            outcome: row.outcome,
            averageSpeedMps: row.average_speed_mps,
            maxSlopeDeg: row.max_slope_deg,
            rerouteCount: row.reroute_count,
            createdAt: row.created_at,
          }));
        }
      } catch (err) {
        console.warn('Error fetching missions from Supabase cloud:', err);
      }
    }

    // Local synchronized store
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(MISSIONS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    return [];
  }
}
