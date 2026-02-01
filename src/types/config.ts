export type UnitSystem = 'lbs' | 'kg';

export interface EquipmentProfile {
  name: string; // e.g., "Home Gym", "Planet Fitness"
  standard_bar_weight_lbs: number; // Usually 45
  trap_bar_weight_lbs: number; // Usually 55-65
  available_plates_lbs: number[]; // [45, 45, 25, 25, 10, 10, 5, 5, 2.5, 2.5]
}

export interface UserConfig {
  units: UnitSystem;
  equipment: EquipmentProfile;
  timer_audio_enabled: boolean;
  timer_vibration_enabled: boolean;
  timer_notifications_enabled: boolean;
  github_sync_enabled: boolean;
  github_username?: string;
  github_repo?: string;
  device_id: string;
  created_at: string;
  updated_at: string;
}

// Default equipment profile for a standard gym
export const DEFAULT_EQUIPMENT: EquipmentProfile = {
  name: 'Standard Gym',
  standard_bar_weight_lbs: 45,
  trap_bar_weight_lbs: 55,
  available_plates_lbs: [45, 45, 45, 45, 25, 25, 10, 10, 5, 5, 2.5, 2.5],
};

// Generate a device ID
export function generateDeviceId(): string {
  return `${navigator.userAgent.slice(0, 10).replace(/\W/g, '')}_${Date.now().toString(36)}`;
}

// Create default config
export function createDefaultConfig(): UserConfig {
  return {
    units: 'lbs',
    equipment: DEFAULT_EQUIPMENT,
    timer_audio_enabled: true,
    timer_vibration_enabled: true,
    timer_notifications_enabled: true,
    github_sync_enabled: false,
    device_id: generateDeviceId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Convert weight between units
export function convertWeight(
  weight: number,
  from: UnitSystem,
  to: UnitSystem
): number {
  if (from === to) return weight;
  if (from === 'lbs' && to === 'kg') {
    return Math.round(weight * 0.453592 * 10) / 10;
  }
  if (from === 'kg' && to === 'lbs') {
    return Math.round(weight * 2.20462 * 10) / 10;
  }
  return weight;
}

// Calculate total weight from plates per side
export function calculateTotalWeight(
  platesPerSide: number,
  barWeight: number
): number {
  // platesPerSide is the weight on ONE side
  // Total = (plates per side × 2) + bar weight
  return platesPerSide * 2 + barWeight;
}

// Calculate plates needed for target weight (one side)
export function calculatePlatesPerSide(
  targetWeight: number,
  barWeight: number
): number {
  const weightPerSide = (targetWeight - barWeight) / 2;
  return Math.max(0, weightPerSide);
}
