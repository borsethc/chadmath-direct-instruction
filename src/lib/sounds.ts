// Web Audio API Sound Synthesizer for ChadMath Direct Instruction

class SoundController {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public playKeyClick() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }

  public playCorrect(streak: number = 1) {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    // Escalating Pentatonic Musical Scale
    const scale = [
      [523.25, 659.25],          // 1: C5 + E5
      [587.33, 783.99],          // 2: D5 + G5
      [659.25, 880.00],          // 3: E5 + A5
      [783.99, 1046.50],         // 4: G5 + C6
      [880.00, 1046.50, 1318.51], // 5: A5 + C6 + E6 (Triad!)
      [1046.50, 1318.51, 1567.98],// 6: C6 + E6 + G6
      [1174.66, 1567.98, 1760.00],// 7: D6 + G6 + A6
      [1318.51, 1760.00, 2093.00],// 8: E6 + A6 + C7
      [1567.98, 2093.00, 2637.02],// 9: G6 + C7 + E7
    ];

    const isSupernova = streak >= 10;
    const notes = isSupernova
      ? [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00] // Full 7-note arpeggio!
      : scale[Math.min(scale.length - 1, Math.max(0, streak - 1))];

    const noteDuration = isSupernova ? 0.05 : 0.04;
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isSupernova ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * noteDuration);

      const peakVolume = isSupernova ? 0.16 : 0.18 + Math.min(0.06, streak * 0.008);
      gain.gain.setValueAtTime(0, ctx.currentTime + idx * noteDuration);
      gain.gain.linearRampToValueAtTime(peakVolume, ctx.currentTime + idx * noteDuration + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * noteDuration + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * noteDuration);
      osc.stop(ctx.currentTime + idx * noteDuration + 0.32);
    });
  }

  public playIncorrect() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    // Gentle non-punitive double tap
    [220, 196].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

      gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.1);
      osc.stop(ctx.currentTime + idx * 0.1 + 0.18);
    });
  }

  public playModelChime() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  public playFanfare() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const chords = [
      { freq: 523.25, time: 0.0 }, // C5
      { freq: 659.25, time: 0.12 }, // E5
      { freq: 783.99, time: 0.24 }, // G5
      { freq: 1046.5, time: 0.36 }, // C6
      { freq: 1318.51, time: 0.5 }, // E6
    ];

    chords.forEach((c) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(c.freq, ctx.currentTime + c.time);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + c.time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + c.time + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + c.time);
      osc.stop(ctx.currentTime + c.time + 0.6);
    });
  }
}

export const soundEffects = new SoundController();
