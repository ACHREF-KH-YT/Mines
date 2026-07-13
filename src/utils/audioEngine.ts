/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API Sound Generator for Mines Simulator
// Synthesizes sound effects and background music programmatically in real time.

class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicInterval: any = null;
  private currentNotes: OscillatorNode[] = [];
  thisIsActuallyPrivateButLetSUseVar: any = null;
  private isMusicPlaying: boolean = false;
  private sfxVolume: number = 0.5;
  private musicVolume: number = 0.2;

  // Custom audio buffers uploaded by the user
  private customSounds: { [key: string]: AudioBuffer | null } = {
    click: null,
    diamond: null,
    explosion: null,
    cashout: null,
    loss: null,
    music: null
  };

  private customMusicSource: AudioBufferSourceNode | null = null;

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      // SFX Gain Node
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.ctx.destination);

      // Music Gain Node
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Failed to initialize Web Audio API", e);
    }
  }

  private resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setSFXVolume(volume: number) {
    this.sfxVolume = volume;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
  }

  setMusicVolume(volume: number) {
    this.musicVolume = volume;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
  }

  async registerCustomSound(key: string, fileData: ArrayBuffer): Promise<boolean> {
    this.resume();
    if (!this.ctx) {
      throw new Error("Audio Context not initialized");
    }
    try {
      // Use the standard decodeAudioData which returns a Promise
      const audioBuffer = await this.ctx.decodeAudioData(fileData);
      this.customSounds[key] = audioBuffer;
      
      // If we just registered new custom music and music is active, restart it
      if (key === "music" && this.isMusicPlaying) {
        this.stopMusic();
        this.startMusic();
      }
      return true;
    } catch (e) {
      console.error(`Error decoding custom audio data for key: ${key}`, e);
      throw e;
    }
  }

  clearCustomSound(key: string) {
    this.customSounds[key] = null;
    if (key === "music" && this.isMusicPlaying) {
      this.stopMusic();
      this.startMusic();
    }
  }

  hasCustomSound(key: string): boolean {
    return !!this.customSounds[key];
  }

  private playCustomSound(key: string, gainNode: GainNode): boolean {
    if (!this.ctx || !this.customSounds[key] || !gainNode) return false;
    try {
      const source = this.ctx.createBufferSource();
      source.buffer = this.customSounds[key];
      source.connect(gainNode);
      source.start();
      return true;
    } catch (e) {
      console.warn(`Failed to play custom sound for ${key}`, e);
      return false;
    }
  }

  getAudioStream(): MediaStream | null {
    this.resume();
    if (!this.ctx || !this.sfxGain || !this.musicGain) return null;
    try {
      const dest = this.ctx.createMediaStreamDestination();
      // Connect our existing nodes to the stream destination
      this.sfxGain.connect(dest);
      this.musicGain.connect(dest);
      return dest.stream;
    } catch (e) {
      console.warn("Could not create Web Audio stream destination", e);
      return null;
    }
  }

  playClick() {
    this.resume();
    if (!this.ctx || !this.sfxGain) return;

    if (this.playCustomSound("click", this.sfxGain)) {
      return;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  // Plays a crystal-clear diamond chime. Pitch increases with streak!
  playDiamond(streak: number = 0) {
    this.resume();
    if (!this.ctx || !this.sfxGain) return;

    if (this.playCustomSound("diamond", this.sfxGain)) {
      return;
    }

    const now = this.ctx.currentTime;
    
    // Scale pitch based on streak (pentatonic scale for a happy progression)
    const baseFreqs = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
    const pitchIndex = streak % baseFreqs.length;
    const baseFreq = baseFreqs[pitchIndex] * (1 + Math.floor(streak / baseFreqs.length) * 0.5);

    // Primary bell tone
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.4);

    // Shimmering overtone
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(baseFreq * 2, now);

    // Envelopes
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);

    osc1.start();
    osc1.stop(now + 0.5);
    osc2.start();
    osc2.stop(now + 0.3);
  }

  // Synthesizes an intense low-end explosion for Mine Hit
  playExplosion() {
    this.resume();
    if (!this.ctx || !this.sfxGain) return;

    if (this.playCustomSound("explosion", this.sfxGain)) {
      return;
    }

    const now = this.ctx.currentTime;
    const duration = 1.2;

    // Create a noise buffer (white noise)
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // Filters for explosive texture
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + duration);

    // Gain Envelope
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Low rumble sub-oscillator
    const subOsc = this.ctx.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(100, now);
    subOsc.frequency.exponentialRampToValueAtTime(20, now + 0.5);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    // Connections
    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    noiseSource.start();
    noiseSource.stop(now + duration);

    subOsc.start();
    subOsc.stop(now + 0.6);
  }

  // Satisfying cashout victory arpeggio
  playCashout() {
    this.resume();
    if (!this.ctx || !this.sfxGain) return;

    if (this.playCustomSound("cashout", this.sfxGain)) {
      return;
    }

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major scale

    notes.forEach((freq, i) => {
      const triggerTime = now + i * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, triggerTime);

      gain.gain.setValueAtTime(0.25, triggerTime);
      gain.gain.exponentialRampToValueAtTime(0.001, triggerTime + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(triggerTime);
      osc.stop(triggerTime + 0.32);
    });
  }

  // Descending sad synth tone when losing the game
  playSadLoss() {
    this.resume();
    if (!this.ctx || !this.sfxGain) return;

    if (this.playCustomSound("loss", this.sfxGain)) {
      return;
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.6);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    // Filter to make it warm/sad and not harsh
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(now + 0.7);
  }

  // Gentle, looping ambient background music
  startMusic() {
    this.resume();
    if (this.isMusicPlaying) return;
    if (!this.ctx || !this.musicGain) return;

    this.isMusicPlaying = true;

    // Check if there's custom uploaded background music
    if (this.customSounds.music) {
      try {
        this.customMusicSource = this.ctx.createBufferSource();
        this.customMusicSource.buffer = this.customSounds.music;
        this.customMusicSource.loop = true;
        this.customMusicSource.connect(this.musicGain);
        this.customMusicSource.start();
      } catch (e) {
        console.warn("Failed to play custom looping music", e);
      }
      return;
    }

    let step = 0;

    // Chords: Am -> G -> F -> Em (cyberpunk-ish warm retro vibe)
    const chords = [
      [220.00, 261.63, 329.63, 392.00], // Am7
      [196.00, 246.94, 293.66, 392.00], // G6
      [174.61, 220.00, 261.63, 349.23], // Fmaj7
      [164.81, 196.00, 246.94, 329.63], // Em7
    ];

    const playChord = () => {
      if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;
      const now = this.ctx.currentTime;
      const chord = chords[step % chords.length];
      step++;

      const nodes: OscillatorNode[] = [];
      const gains: GainNode[] = [];

      chord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        // Warm triangle synth sound
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);

        // Slow attack, long release
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 1.5);
        gain.gain.setValueAtTime(0.08, now + 3.0);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 4.5);

        // Gentle filter
        const filter = this.ctx!.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.linearRampToValueAtTime(700, now + 2.0);
        filter.frequency.linearRampToValueAtTime(450, now + 4.0);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain!);

        osc.start(now);
        osc.stop(now + 4.6);

        nodes.push(osc);
      });

      // Arpeggiate a high note occasionally for extra sparkle
      if (Math.random() > 0.3) {
        const arpeggioNotes = [440.00, 493.88, 523.25, 587.33, 659.25, 783.99, 880.00];
        const highFreq = arpeggioNotes[Math.floor(Math.random() * arpeggioNotes.length)];
        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();

        arpOsc.type = "sine";
        arpOsc.frequency.setValueAtTime(highFreq, now + 1.0 + Math.random() * 2);

        arpGain.gain.setValueAtTime(0, now + 1.0);
        arpGain.gain.linearRampToValueAtTime(0.03, now + 1.5);
        arpGain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);

        arpOsc.connect(arpGain);
        arpGain.connect(this.musicGain);

        arpOsc.start(now + 1.0);
        arpOsc.stop(now + 3.6);
      }
    };

    // Trigger immediately and then loop every 4.5 seconds
    playChord();
    this.musicInterval = setInterval(playChord, 4500);
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.customMusicSource) {
      try {
        this.customMusicSource.stop();
      } catch (e) {}
      this.customMusicSource = null;
    }
  }
}

export const audioEngine = new AudioEngine();
