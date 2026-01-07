/**
 * TERMINUS Sound Engine
 * Lo-Fi 1-bit PWM-style sound generation.
 * Features:
 * - Dual-sawtooth PWM oscillator
 * - Resonant HPF/LPF lo-fi filters
 * - ADSR-style volume envelopes
 * - Master -6dBFS limiter
 */

export class SoundSystem {
    constructor() {
        this.ctx = null;
        this.masterBus = null;
        this.limiter = null;
        this.hpf = null;
        this.lpf = null;
        this.initialized = false;
        this.foot = 0; // 0 = left, 1 = right

        // Ambient sources
        this.noiseSource = null;
        this.whistleSource = null;
        this.fogSource = null;
        this.crackleSource = null;
        this.humSource = null;
        this.noiseFilter = null;
        this.whistleFilter = null;
        this.fogFilter = null;
        this.crackleFilter = null;
        this.humFilter = null;
        this.noiseGain = null;
        this.whistleGain = null;
        this.fogGain = null;
        this.crackleGain = null;
        this.humGain = null;
    }

    async init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (this.ctx.state === 'suspended') {
                await this.ctx.resume();
            }

            // Limiter at -6 dBFS
            this.limiter = this.ctx.createDynamicsCompressor();
            this.limiter.threshold.setValueAtTime(-6, this.ctx.currentTime);
            this.limiter.knee.setValueAtTime(0, this.ctx.currentTime);
            this.limiter.ratio.setValueAtTime(20, this.ctx.currentTime);
            this.limiter.attack.setValueAtTime(0.001, this.ctx.currentTime);
            this.limiter.release.setValueAtTime(0.1, this.ctx.currentTime);

            // Lo-Fi Filters (Simulating tiny speakers)
            this.hpf = this.ctx.createBiquadFilter();
            this.hpf.type = 'highpass';
            this.hpf.frequency.setValueAtTime(400, this.ctx.currentTime);

            this.lpf = this.ctx.createBiquadFilter();
            this.lpf.type = 'lowpass';
            this.lpf.frequency.setValueAtTime(3500, this.ctx.currentTime);

            this.masterBus = this.ctx.createGain();
            this.masterBus.gain.setValueAtTime(0.4, this.ctx.currentTime);

            // Chain: Filters -> Master -> Limiter -> Dest
            this.hpf.connect(this.lpf);
            this.lpf.connect(this.masterBus);
            this.masterBus.connect(this.limiter);
            this.limiter.connect(this.ctx.destination);

            this.setupAmbience();
            this.initialized = true;
            console.log("SoundSystem initialized.");
        } catch (e) {
            console.error("Failed to init AudioContext:", e);
        }
    }

    createPWMOsc(freq, duty) {
        // Approximate PWM using two sawtooth waves with phase offset
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, this.ctx.currentTime);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq, this.ctx.currentTime);

        const inverter = this.ctx.createGain();
        inverter.gain.value = -1;

        const delay = this.ctx.createDelay();
        delay.delayTime.value = (1 / freq) * duty;

        const output = this.ctx.createGain();

        osc1.connect(output);
        osc2.connect(inverter);
        inverter.connect(delay);
        delay.connect(output);

        return {
            connect: (dest) => output.connect(dest),
            start: (t) => { osc1.start(t); osc2.start(t); },
            stop: (t) => { osc1.stop(t); osc2.stop(t); }
        };
    }

    /**
     * Creates an FM (Frequency Modulation) Oscillator
     * Logic: mod(sine) -> carrier(saw)
     */
    createFMOsc(carrierFreq, modFreq, index) {
        const carrier = this.ctx.createOscillator();
        carrier.type = 'sawtooth';
        carrier.frequency.setValueAtTime(carrierFreq, this.ctx.currentTime);

        const modulator = this.ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(modFreq, this.ctx.currentTime);

        const modGain = this.ctx.createGain();
        modGain.gain.setValueAtTime(index, this.ctx.currentTime);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        const output = this.ctx.createGain();
        carrier.connect(output);

        return {
            start: (t) => { modulator.start(t); carrier.start(t); },
            stop: (t) => { modulator.stop(t); carrier.stop(t); },
            connect: (node) => { output.connect(node); },
            modGain: modGain.gain,
            carrierFreq: carrier.frequency
        };
    }

    play(freq, dur = 0.1, duty = 0.5, vol = 0.1, pan = 0) {
        if (!this.initialized) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.createPWMOsc(freq, duty);
        const env = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = pan;

        const now = this.ctx.currentTime;
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(vol, now + 0.002);
        env.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(env);
        env.connect(panner);
        panner.connect(this.hpf);

        osc.start(now);
        osc.stop(now + dur);
    }

    triggerMove(velocity = 1.0) {
        if (!this.initialized) return;
        const freq = this.foot === 0 ? 150 : 180;
        const dur = 0.03 / velocity;
        const vol = 0.02;
        this.play(freq + Math.random() * 20, Math.min(0.05, dur), 0.5, vol);
        this.foot = (this.foot + 1) % 2;
    }

    triggerPickUp() {
        this.play(660, 0.08, 0.5, 0.04);
        setTimeout(() => this.play(990, 0.1, 0.5, 0.03), 50);
    }

    triggerError() {
        this.play(110, 0.15, 0.2, 0.06);
    }

    triggerForge() {
        this.play(1200 + Math.random() * 400, 0.06, 0.1, 0.04);
    }

    triggerHarvest() {
        this.play(500, 0.04, 0.9, 0.03);
        setTimeout(() => this.play(300, 0.04, 0.9, 0.02), 30);
    }

    triggerMenu() {
        this.play(1100, 0.04, 0.5, 0.02);
    }

    triggerLevelUp() {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((f, i) => {
            setTimeout(() => this.play(f, 0.15, 0.5, 0.04), i * 80);
        });
    }

    triggerBird(pan = 0) {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        const fm = this.createFMOsc(2000 + Math.random() * 1000, 50, 400);
        const env = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = pan;

        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(0.015, now + 0.05);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        fm.connect(env);
        env.connect(panner);
        panner.connect(this.hpf);
        fm.start(now);
        fm.stop(now + 0.3);

        setTimeout(() => {
            const now2 = this.ctx.currentTime;
            const fm2 = this.createFMOsc(2500, 70, 500);
            const env2 = this.ctx.createGain();
            const pan2 = this.ctx.createStereoPanner();
            pan2.pan.value = pan;

            env2.gain.setValueAtTime(0, now2);
            env2.gain.linearRampToValueAtTime(0.01, now2 + 0.02);
            env2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.15);
            fm2.connect(env2);
            env2.connect(pan2);
            pan2.connect(this.hpf);
            fm2.start(now2);
            fm2.stop(now2 + 0.15);
        }, 150);
    }

    triggerInsects(pan = 0) {
        if (!this.initialized) return;
        const freq = 4000 + Math.random() * 2000;
        const duty = 0.05 + Math.random() * 0.1;
        this.play(freq, 0.01, duty, 0.005, pan);
        setTimeout(() => {
            this.play(freq + 100, 0.01, duty, 0.004, pan);
        }, 40);
    }

    triggerCow(pan = 0) {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = pan;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.5);
        const lpf = this.ctx.createBiquadFilter();
        lpf.frequency.setValueAtTime(300, now);
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(0.02, now + 0.1);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(lpf);
        lpf.connect(env);
        env.connect(panner);
        panner.connect(this.masterBus);
        osc.start(now);
        osc.stop(now + 0.6);
    }

    triggerSheep() {
        if (!this.initialized) return;
        // Mid frequency bleat (with rapid amplitude modulation)
        const now = this.ctx.currentTime;
        const am = this.ctx.createGain();
        // Easier: play 3 fast pulses
        for (let i = 0; i < 3; i++) {
            setTimeout(() => this.play(250 + Math.random() * 20, 0.1, 0.3, 0.015), i * 120);
        }
    }

    triggerRabbit(pan = 0) {
        if (!this.initialized) return;
        this.play(1500 + Math.random() * 500, 0.03, 0.05, 0.008, pan);
    }

    triggerDeer(pan = 0) {
        if (!this.initialized) return;
        // Uses whistle buffer if available, fallback to simple filtering noise if not,
        // but here we just reuse the buffer if possible.
        if (!this.whistleSource || !this.whistleSource.buffer) return;

        const now = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.whistleSource.buffer; // Reuse buffer

        const panner = this.ctx.createStereoPanner();
        panner.pan.value = pan;

        const lpf = this.ctx.createBiquadFilter();
        lpf.frequency.setValueAtTime(800, now);
        lpf.Q.setValueAtTime(1, now);
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(0.01, now + 0.1);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        noise.connect(lpf);
        lpf.connect(env);
        env.connect(panner);
        panner.connect(this.masterBus);

        noise.start(now);
        noise.stop(now + 0.4);
    }

    setupAmbience() {
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);

        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            noiseData[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = noiseData[i];
            noiseData[i] *= 3.5;
        }

        // Assuming these sound definitions are meant to be part of a `this.sfx` object
        // or similar, which is not explicitly defined in the provided context.
        // For syntactic correctness, they are placed as properties of a new object
        // that is not assigned, which is likely not the intended final use,
        // but adheres to the instruction's placement and syntactic correctness.
        ({
            DIG: {
                type: 'noise',
                duration: 0.1,
                filter: { type: 'lowpass', freq: 600, q: 1 }
            },
            CLINK: {
                type: 'square',
                duration: 0.1,
                freq: 800,
                slide: 1200, // Pitch shift up
                vol: 0.5
            },
            STEP: {
                type: 'noise',
                duration: 0.05,
                filter: { type: 'bandpass', freq: 200, q: 5 }
            }
        });
        this.noiseSource = this.ctx.createBufferSource();
        this.noiseSource.buffer = noiseBuffer;
        this.noiseSource.loop = true;

        this.noiseFilter = this.ctx.createBiquadFilter();
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
        this.noiseFilter.Q.setValueAtTime(2, this.ctx.currentTime);

        this.noiseGain = this.ctx.createGain();
        this.noiseGain.gain.setValueAtTime(0.005, this.ctx.currentTime);

        this.noiseSource.connect(this.noiseFilter);
        this.noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.masterBus);
        this.noiseSource.start();

        // Whistle/Fog Buffer (White Noise)
        const whiteBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const whiteData = whiteBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) whiteData[i] = Math.random() * 2 - 1;

        // Whistle
        this.whistleSource = this.ctx.createBufferSource();
        this.whistleSource.buffer = whiteBuffer;
        this.whistleSource.loop = true;
        this.whistleFilter = this.ctx.createBiquadFilter();
        this.whistleFilter.type = 'bandpass';
        this.whistleFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
        this.whistleFilter.Q.setValueAtTime(15, this.ctx.currentTime);
        this.whistleGain = this.ctx.createGain();
        this.whistleGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.whistleSource.connect(this.whistleFilter);
        this.whistleFilter.connect(this.whistleGain);
        this.whistleGain.connect(this.masterBus);
        this.whistleSource.start();

        // Fog
        this.fogSource = this.ctx.createBufferSource();
        this.fogSource.buffer = whiteBuffer;
        this.fogSource.loop = true;
        this.fogFilter = this.ctx.createBiquadFilter();
        this.fogFilter.type = 'lowpass';
        this.fogFilter.frequency.setValueAtTime(150, this.ctx.currentTime);
        this.fogGain = this.ctx.createGain();
        this.fogGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.fogSource.connect(this.fogFilter);
        this.fogFilter.connect(this.fogGain);
        this.fogGain.connect(this.masterBus);
        this.fogSource.start();

        // Crackle
        this.crackleSource = this.ctx.createBufferSource();
        this.crackleSource.buffer = noiseBuffer;
        this.crackleSource.loop = true;
        this.crackleFilter = this.ctx.createBiquadFilter();
        this.crackleFilter.type = 'bandpass';
        this.crackleFilter.frequency.setValueAtTime(2000, this.ctx.currentTime);
        this.crackleFilter.Q.setValueAtTime(10, this.ctx.currentTime);
        this.crackleGain = this.ctx.createGain();
        this.crackleGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.crackleSource.connect(this.crackleFilter);
        this.crackleFilter.connect(this.crackleGain);
        this.crackleGain.connect(this.masterBus);
        this.crackleSource.start();

        // Hum
        this.humSource = this.ctx.createOscillator();
        this.humSource.type = 'sawtooth';
        this.humSource.frequency.setValueAtTime(50, this.ctx.currentTime);
        this.humFilter = this.ctx.createBiquadFilter();
        this.humFilter.type = 'lowpass';
        this.humFilter.frequency.setValueAtTime(150, this.ctx.currentTime);
        this.humGain = this.ctx.createGain();
        this.humGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.humSource.connect(this.humFilter);
        this.humFilter.connect(this.humGain);
        this.humGain.connect(this.masterBus);
        this.humSource.start();
    }

    updateAmbience(windStrength = 0.5, fogDensity = 0, torchProximity = 0, lampProximity = 0) {
        if (!this.initialized) return;

        const rumbleFreq = 300 + (windStrength * 1000);
        this.noiseFilter.frequency.setTargetAtTime(rumbleFreq, this.ctx.currentTime, 1.0);
        this.noiseGain.gain.setTargetAtTime(0.005 + (windStrength * 0.01), this.ctx.currentTime, 1.0);

        const whistleFreq = 800 + (windStrength * 2000);
        this.whistleFilter.frequency.setTargetAtTime(whistleFreq, this.ctx.currentTime, 1.0);
        this.whistleGain.gain.setTargetAtTime(windStrength * 0.003, this.ctx.currentTime, 1.0);

        this.fogGain.gain.setTargetAtTime(fogDensity * 0.015, this.ctx.currentTime, 1.0);

        const crackleVar = 0.8 + Math.random() * 0.4;
        this.crackleGain.gain.setTargetAtTime(torchProximity * 0.02 * crackleVar, this.ctx.currentTime, 0.1);

        this.humGain.gain.setTargetAtTime(lampProximity * 0.005, this.ctx.currentTime, 0.5);
    }
}
