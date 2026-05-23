/**
 * Triggers a light haptic vibration feedback if supported by the device.
 * @param duration Duration of vibration in milliseconds (default: 10ms)
 */
export function triggerHaptic(duration = 10): void {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    try {
      window.navigator.vibrate(duration);
    } catch (err) {
      console.warn("Haptic feedback failed:", err);
    }
  }
}
