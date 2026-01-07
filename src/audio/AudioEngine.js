/**
 * Audio Engine (8-bit Tracker Style)
 * Manages 4 virtual "hardware" channels.
 */
import Sampler from './Sampler.js';

export default class AudioEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // --- Master Chain ---

        // 1. Limiter (DynamicsCompressor with high ratio)
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -6; // -6 dBFS
        this.limiter.knee.value = 0;       // Hard limiter
        this.limiter.ratio.value = 20;     // High ratio
        this.limiter.attack.value = 0.003; // Fast attack
        this.limiter.release.value = 0.1;  // Normal release
        this.limiter.connect(this.ctx.destination);

        // 2. Reverb / Reverb Feel (Convolver or simple Delay/Filter)
        // For "Dungeon Synth", we'll use a very soft Low-Pass Filter and a long reverb.
        this.synthFilter = this.ctx.createBiquadFilter();
        this.synthFilter.type = 'lowpass';
        this.synthFilter.frequency.value = 2500; // Damped high frequencies
        this.synthFilter.connect(this.limiter);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.synthFilter);

        // Limit to 4 channels as per hardware spec
        this.channels = [
            new Sampler(this.ctx, this.masterGain),
            new Sampler(this.ctx, this.masterGain),
            new Sampler(this.ctx, this.masterGain),
            new Sampler(this.ctx, this.masterGain)
        ];

        this.enabled = false;

        // Unlock audio on first user interaction
        window.addEventListener('click', () => this.resume(), { once: true });
        window.addEventListener('keydown', () => this.resume(), { once: true });
    }

    resume() {
        if (!this.enabled) {
            this.ctx.resume().then(() => {
                this.enabled = true;
                console.log('Audio System Online: 4 Channels Ready');
            });
        }
    }

    /**
     * Play a sound on the first available channel, or override the oldest/lowest priority.
     * @param {Object} buffer - AudioBuffer (8-bit source ideally)
     * @param {Number} priority - 0 (Low) to 10 (High/Critical)
     * @param {Number} pitch - Playback rate (1.0 = normal)
     */
    play(buffer, priority = 5, pitch = 1.0) {
        if (!this.enabled || !buffer) return;

        // 1. Find free channel
        let channel = this.channels.find(c => !c.isPlaying);

        // 2. If no free channel, find lowest priority to steal
        if (!channel) {
            // Sort by priority (ascending) and then by start time (oldest first)
            // For now, just simple priority check
            channel = this.channels.reduce((prev, curr) => {
                if (curr.priority < prev.priority) return curr;
                return prev;
            });

            // Only steal if new sound is higher or equal priority
            if (channel.priority > priority) {
                return; // Cannot play, all channels busy with higher priority
            }
            // Steal it
            channel.stop();
        }

        channel.play(buffer, priority, pitch);
    }
}
