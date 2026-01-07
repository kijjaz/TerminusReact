/**
 * Procedural Generator
 * Generates chunk data using Noise functions.
 */
import { CHUNK_SIZE } from './World.js';
import { Noise } from '../engine/Noise.js';
import { STRUCTURES } from './Structures.js';

export class Generator {
    constructor(seed) {
        this.noise = new Noise(seed);
        this.caveNoise = new Noise(seed + 123);
        this.structureNoise = new Noise(seed + 456);
        this.vegetationNoise = new Noise(seed + 789);
    }

    generateChunk(cx, cy) {
        const data = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);

        // 1. Terrain Pass
        for (let y = 0; y < CHUNK_SIZE; y++) {
            for (let x = 0; x < CHUNK_SIZE; x++) {
                const globalX = cx * CHUNK_SIZE + x;
                const globalY = cy * CHUNK_SIZE + y;
                const idx = y * CHUNK_SIZE + x;

                const scale = 0.05;
                const distFromCenter = Math.sqrt(globalX * globalX);
                let surfaceY = 30 + this.noise.get(globalX * scale, 0) * 20;

                if (distFromCenter < 200) { // Larger Town Radius
                    surfaceY = 30;
                } else if (distFromCenter < 300) {
                    const t = (distFromCenter - 200) / 100;
                    surfaceY = 30 * (1 - t) + surfaceY * t;
                }

                if (globalY < surfaceY) {
                    data[idx] = 0;
                } else if (globalY === Math.floor(surfaceY)) {
                    data[idx] = 3; // Grass
                } else {
                    data[idx] = 1; // Stone
                    const caveVal = this.caveNoise.get(globalX * 0.08, globalY * 0.08);
                    if (caveVal > 0.45) {
                        data[idx] = 0;
                    } else if (globalY < surfaceY + 5) {
                        data[idx] = 2; // Dirt
                    }
                }
                if (globalY > 900) data[idx] = 5; // Bedrock
            }
        }

        // 2. Structure & Vegetation Pass
        if (cy === 0) {
            this.applyGenerativeFarms(data, cx);
            if (Math.abs(cx) < 1) {
                this.applyCastle(data, cx);
            }
            this.applyVegetation(data, cx);
        }

        return data;
    }

    applyGenerativeFarms(data, cx) {
        for (let x = 10; x < CHUNK_SIZE - 10; x++) {
            const globalX = cx * CHUNK_SIZE + x;
            const dist = Math.abs(globalX);

            if (dist > 50 && dist < 250) {
                const n = this.structureNoise.get(globalX * 0.1, 0);
                if (n > 0.7) {
                    const surfaceY = 30;
                    const type = n > 0.85 ? STRUCTURES.HOUSE : STRUCTURES.FARM;
                    type.build(this, x, surfaceY, data, CHUNK_SIZE);
                    x += type.width + 5;
                }
            }
        }
    }

    applyCastle(data, cx) {
        const surfaceY = 30;
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const globalX = cx * CHUNK_SIZE + x;
            if (globalX > -40 && globalX < 40) {
                STRUCTURES.CASTLE_WALL.build(this, x, surfaceY, data, CHUNK_SIZE);
            }
        }
    }

    applyVegetation(data, cx) {
        for (let x = 2; x < CHUNK_SIZE - 2; x++) {
            const globalX = cx * CHUNK_SIZE + x;
            const dist = Math.abs(globalX);

            // Towns are less crowded with trees
            const threshold = dist < 300 ? 0.98 : 0.9; // Adjusted for better density
            const n = this.vegetationNoise.get(globalX * 0.2, 0);

            if (n > threshold) {
                // Find surface
                let surfaceY = -1;
                for (let y = 0; y < CHUNK_SIZE; y++) {
                    if (data[y * CHUNK_SIZE + x] === 3) { // Grass
                        surfaceY = y;
                        break;
                    }
                }

                if (surfaceY > 5) {
                    // Check neighbors to avoid crowding
                    const left = data[surfaceY * CHUNK_SIZE + x - 1];
                    const right = data[surfaceY * CHUNK_SIZE + x + 1];
                    if (left === 6 || left === 7 || left === 8 || right === 6 || right === 7 || right === 8) {
                        continue; // Too crowded
                    }

                    // Initial state: Sapling or Small Tree based on noise
                    data[(surfaceY - 1) * CHUNK_SIZE + x] = n > 0.99 ? 7 : 6;
                }
            }
        }
    }
}
