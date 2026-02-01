/**
 * Haptic feedback utilities for mobile devices
 * Uses the Vibration API where available
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

// Vibration patterns in milliseconds
const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10], // Short-pause-short
  warning: [50, 100, 50], // Medium-pause-medium
  error: [100, 50, 100, 50, 100], // Long repeating
};

/**
 * Check if vibration is supported
 */
export function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback
 * @param pattern - The type of feedback pattern
 * @param enabled - Whether haptics are enabled (from user settings)
 */
export function triggerHaptic(pattern: HapticPattern = 'light', enabled: boolean = true): void {
  if (!enabled || !isHapticsSupported()) {
    return;
  }

  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Vibration failed, ignore
  }
}

/**
 * Cancel any ongoing vibration
 */
export function cancelHaptic(): void {
  if (!isHapticsSupported()) {
    return;
  }

  try {
    navigator.vibrate(0);
  } catch {
    // Cancel failed, ignore
  }
}
