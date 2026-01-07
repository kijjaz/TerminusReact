/**
 * Sound Assets & Generator
 * Generates 8-bit style procedural sounds.
 */
export const SFX = {
    JUMP: null,
    LAND: null,
    WALK: null,
    DIG: null
};

// Procedural Generation of 8-bit Noise/Waves
export function initAudioAssets(ctx) {
    SFX.JUMP = createSquareWave(ctx, 400, 0.1, -1000); // Frequency slide down
    SFX.LAND = createNoise(ctx, 0.05); // Short noise burst
    SFX.WALK = createNoise(ctx, 0.02); // Very short tick
    SFX.DIG = createSquareWave(ctx, 100, 0.08, -500); // Low crunch
}

function createSquareWave(ctx, freq, duration, slide = 0) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const currentFreq = freq + (slide * t);
        // 8-bit Square Wave: -1 or 1 (simplified to float -1.0 to 1.0)
        // Quantize to 8-bit steps if we want strict authenticity? 
        // Let's just do standard square wave for now.
        const val = Math.sin(t * currentFreq * 2 * Math.PI) > 0 ? 1 : -1;

        // Apply envelope (decay)
        const env = 1 - (i / length);
        data[i] = val * env * 0.5;
    }
    return buffer;
}

function createNoise(ctx, duration) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
        // White noise
        const val = Math.random() * 2 - 1;
        const env = 1 - (i / length);
        data[i] = val * env * 0.5;
    }
    return buffer;
}
