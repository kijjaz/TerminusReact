import { Generator } from './Generator.js';
import { BLOCK_DEFS } from './Blocks.js';

export const CELL_SIZE = 16;
export const CHUNK_SIZE = 32; // 32x32 blocks

export class World {
    constructor(seed = Math.random()) {
        this.seed = seed;
        this.chunks = new Map(); // "x,y" -> Chunk Data
        this.generator = new Generator(seed);
        this.tickRate = 10; // Balanced for performance and growth
    }

    // Process random ticks for loaded chunks
    tick(cx, cy) {
        const chunk = this.getChunk(cx, cy);
        if (!chunk) return;

        for (let i = 0; i < this.tickRate; i++) {
            const lx = Math.floor(Math.random() * CHUNK_SIZE);
            const ly = Math.floor(Math.random() * CHUNK_SIZE);
            const id = chunk[ly * CHUNK_SIZE + lx];

            if (BLOCK_DEFS[id] && BLOCK_DEFS[id].tick) {
                const wx = cx * CHUNK_SIZE + lx;
                const wy = cy * CHUNK_SIZE + ly;
                BLOCK_DEFS[id].tick(this, wx, wy);
            }
        }
    }


    // Convert world pos to chunk key
    getChunkKey(cx, cy) {
        return `${cx},${cy}`;
    }

    getChunk(cx, cy) {
        const key = this.getChunkKey(cx, cy);
        if (this.chunks.has(key)) {
            return this.chunks.get(key);
        }

        // Gen new chunk
        const chunk = this.generator.generateChunk(cx, cy);
        this.chunks.set(key, chunk);
        return chunk;
    }

    getTile(x, y) {
        const cx = Math.floor(x / CHUNK_SIZE);
        const cy = Math.floor(y / CHUNK_SIZE);

        // Local coordinates within chunk
        let lx = x % CHUNK_SIZE;
        let ly = y % CHUNK_SIZE;

        // Handle negative modulo correctly
        if (lx < 0) lx += CHUNK_SIZE;
        if (ly < 0) ly += CHUNK_SIZE;

        const chunk = this.getChunk(cx, cy);
        if (!chunk) return 0;

        return chunk[ly * CHUNK_SIZE + lx];
    }

    setTile(x, y, id) {
        const cx = Math.floor(x / CHUNK_SIZE);
        const cy = Math.floor(y / CHUNK_SIZE);

        let lx = x % CHUNK_SIZE;
        let ly = y % CHUNK_SIZE;
        if (lx < 0) lx += CHUNK_SIZE;
        if (ly < 0) ly += CHUNK_SIZE;

        const chunk = this.getChunk(cx, cy);
        if (chunk) {
            chunk[ly * CHUNK_SIZE + lx] = id;
            return true;
        }
        return false;
    }

    setTileAtPos(wx, wy, id) {
        const tx = Math.floor(wx / CELL_SIZE);
        const ty = Math.floor(wy / CELL_SIZE);
        return this.setTile(tx, ty, id);
    }

    getTileAtPos(wx, wy) {
        const tx = Math.floor(wx / CELL_SIZE);
        const ty = Math.floor(wy / CELL_SIZE);
        return this.getTile(tx, ty);
    }

    // Helper to get AABB of a tile
    getTileAABB(x, y) {
        return {
            x: x * CELL_SIZE,
            y: y * CELL_SIZE,
            w: CELL_SIZE,
            h: CELL_SIZE
        };
    }
}
