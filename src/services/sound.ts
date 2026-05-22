/**
 * Synthesizes a gentle dual-tone chime notification using the browser's native Web Audio API.
 * This works entirely offline and requires no static asset loading.
 */
export function playChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    // Play a friendly two-tone chime: E5 followed by A5
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startTime);
      
      // Gentle entry, then fade out exponentially to zero
      gainNode.gain.setValueAtTime(0.15, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = ctx.currentTime;
    playTone(659.25, now, 0.3);        // E5 tone (0.3s duration)
    playTone(880.00, now + 0.15, 0.5);  // A5 tone (0.5s duration, starting 150ms later)
  } catch (err) {
    console.warn("Failed to play notification chime (audio context blocked or unsupported):", err);
  }
}
