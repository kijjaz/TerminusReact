/**
 * TERMINUS World Manager (Minerio Theme)
 * The Fungal Caverns
 */

import { Noise } from './Noise.js';

export const TILE_TYPES = {
    // Terrain (Minerio Blocks)
    VOID: ' ',
    DIRT: '.',      // FLOOR
    STONE: '#',     // WALL
    BEDROCK: 'X',   // PERM_WALL
    WOOD: 'W',      // WALL (Impassable)
    PLANKS: '=',    // FLOOR (Walkable)
    LEAVES: '%',    // BRICK? Leaves
    DOOR: '+',
    OPEN_DOOR: "'",
    STAIR_UP: '<',
    STAIR_DOWN: '>',
    TREE: 'T',
    GRASS: '"',
    WATER: '~',     // Blue Stained Glass/Water
    LAVA: '`',
    MOUNTAIN: '^',
    SAND: 's',
    LOG: 'L',
    RUBBLE: ':',
    ICE: '{',
    MUSHROOM: 'o',  // New Primary Vegetation

    // Entities (Minerio Mobs)
    PLAYER: '@',
    SPORE: 'p',     // Walking Spore (Magenta)
    SHELL_HIDE: 'y',// Yellow Shell Hide
    GROMP: 'G',     // Boss/Guard
    MERCHANT: 'S',  // Spore Merchant

    // Items / Interactive
    GOLD: '$',
    POTION: '!',
    SCROLL: '?',
    SWORD: '/',
    SHIELD: '[',
    ARMOR: '(',
    RING: '=',
    AMULET: '"',
    CHEST: '&',
    TRAP: '^',
    WELL: 'o',
    FOUNTAIN: 'f',
    STATUE: '8',
    ALTAR: '_',
    BOOK: '?',
    KEY: 'k',
    GATE: '#',
    FORGE: '&',
    SOIL: ':',
    SPROUT: 'v',
    PLANT: 'I',
    HARVEST: 'W',
    SHOP: 'S',
    BANK: 'B',
    SIGN: ']',

    // Ambient
    TORCH: 'i',
    MESE_LAMP: 'o' // Retain for now as Mushroom Lamps
};

export class World {
    constructor(width = 400, height = 400) {
        this.width = width;
        this.height = height;
        this.levels = {}; // id -> { id, grid, colors, explored, width, height }
        this.currentLevel = 'fungal_caverns'; // Minerio Theme
        this.noise = new Noise(Math.random());
        this.biomeNoise = new Noise(Math.random() + 100);
        this.moatNoise = new Noise(Math.random() + 200);

        // Core Hub
        this.createLevel('fungal_caverns', 400, 400);
        this.generateFungalWilderness('fungal_caverns');
        this.generateSporeColony('fungal_caverns');

        // Dungeon
        this.createLevel('deep_mycelium', 100, 100);
        this.generateDungeon('deep_mycelium');
    }

    createLevel(id, w, h) {
        this.levels[id] = {
            id,
            storeys: {
                0: {
                    grid: this.createGrid(w, h, TILE_TYPES.VOID),
                    colors: this.createGrid(w, h, 'w'),
                    explored: this.createGrid(w, h, false)
                }
            },
            width: w,
            height: h,
            mobs: [],
            signs: {},
            atmosphere: { type: 'fog' } // Default atmosphere
        };
    }

    createGrid(w, h, fill) {
        const grid = [];
        for (let y = 0; y < h; y++) {
            grid[y] = new Array(w).fill(fill);
        }
        return grid;
    }

    getStorey(id, z) {
        const lv = this.levels[id];
        if (!lv) return null;
        if (!lv.storeys[z]) {
            lv.storeys[z] = {
                grid: this.createGrid(lv.width, lv.height, TILE_TYPES.VOID),
                colors: this.createGrid(lv.width, lv.height, 'w'),
                explored: this.createGrid(lv.width, lv.height, false)
            };
        }
        return lv.storeys[z];
    }

    setSign(x, y, text, id = this.currentLevel) {
        const lv = this.levels[id];
        if (lv) {
            this.setTile(x, y, TILE_TYPES.SIGN, 'U', id);
            lv.signs[`${x},${y}`] = text;
        }
    }

    setLevel(id) {
        if (this.levels[id]) this.currentLevel = id;
    }

    get level() {
        return this.levels[this.currentLevel];
    }

    setTile(x, y, char, color, levelId = this.currentLevel, z = 0) {
        const storey = this.getStorey(levelId, z);
        if (!storey || x < 0 || x >= this.levels[levelId].width || y < 0 || y >= this.levels[levelId].height) return;
        storey.grid[y][x] = char;
        if (color) storey.colors[y][x] = color;
    }

    getTile(x, y, levelId = this.currentLevel, z = 0) {
        const lv = this.levels[levelId];
        if (!lv) return { char: ' ', color: 'w' };
        const storey = lv.storeys[z];
        if (!storey || x < 0 || x >= lv.width || y < 0 || y >= lv.height) return { char: ' ', color: 'w' };
        return { char: storey.grid[y][x], color: storey.colors[y][x], explored: storey.explored[y][x] };
    }

    setExplored(x, y, val = true, levelId = this.currentLevel, z = 0) {
        const storey = this.getStorey(levelId, z);
        if (storey && x >= 0 && x < this.levels[levelId].width && y >= 0 && y < this.levels[levelId].height) {
            storey.explored[y][x] = val;
        }
    }

    isExplored(x, y, levelId = this.currentLevel, z = 0) {
        const lv = this.levels[levelId];
        const storey = lv ? lv.storeys[z] : null;
        if (!storey || x < 0 || x >= lv.width || y < 0 || y >= lv.height) return false;
        return storey.explored[y][x];
    }

    getBiome(x, y) {
        const scale = 0.05;
        const n1 = this.biomeNoise.get(x * scale, y * scale);
        const n2 = this.biomeNoise.get(x * scale * 2, y * scale * 2) * 0.5;
        const val = n1 + n2;

        if (val < -0.3) return 'SPORE_WASTES';
        if (val > 0.4) return 'FUNGAL_JUNGLE';
        return 'CAVERN_FLOOR';
    }

    generateFungalWilderness(id) {
        const lv = this.levels[id];
        for (let y = 0; y < lv.height; y++) {
            for (let x = 0; x < lv.width; x++) {
                const biome = this.getBiome(x, y);
                const n = Math.random();

                if (biome === 'FUNGAL_JUNGLE') {
                    // Dense Mushrooms and Mould
                    if (n > 0.96) this.setTile(x, y, TILE_TYPES.TREE, 'o', id); // Giant Mushroom
                    else if (n > 0.92) this.setTile(x, y, TILE_TYPES.MUSHROOM, 'p', id); // Small Spore
                    else if (n > 0.85) this.setTile(x, y, TILE_TYPES.GRASS, 'g', id); // Mossw
                    else this.setTile(x, y, TILE_TYPES.DIRT, 'D', id);
                } else if (biome === 'SPORE_WASTES') {
                    if (n > 0.98) this.setTile(x, y, TILE_TYPES.MOUNTAIN, 's', id);
                    else if (n > 0.90) this.setTile(x, y, TILE_TYPES.RUBBLE, 's', id);
                    else this.setTile(x, y, TILE_TYPES.DIRT, 'u', id); // Dry Brown Dirt
                } else {
                    // Cavern Floor
                    if (n > 0.99) this.setTile(x, y, TILE_TYPES.STONE, 's', id);
                    else if (n > 0.95) this.setTile(x, y, TILE_TYPES.MUSHROOM, 'o', id);
                    else this.setTile(x, y, TILE_TYPES.DIRT, 'D', id);
                }
            }
        }

        this.generateRivers(id);
        this.generateMobs(id);

        // Random Glow-shrooms (Mese Lamps)
        for (let i = 0; i < 30; i++) {
            const rx = Math.floor(Math.random() * lv.width);
            const ry = Math.floor(Math.random() * lv.height);
            this.setTile(rx, ry, TILE_TYPES.MESE_LAMP, 'o', id);
        }
    }

    generateRivers(id) {
        const lv = this.levels[id];
        const count = 3;
        for (let i = 0; i < count; i++) {
            let cx = Math.random() * lv.width;
            let cy = 0;
            const drift = (Math.random() - 0.5) * 5;
            while (cy < lv.height) {
                const rw = 2 + Math.floor(Math.random() * 3);
                for (let dx = -rw; dx <= rw; dx++) {
                    const tx = Math.floor(cx + dx);
                    if (tx >= 0 && tx < lv.width) {
                        this.setTile(tx, Math.floor(cy), TILE_TYPES.WATER, 'b', id);
                    }
                }
                cx += Math.sin(cy * 0.1) * 2 + drift;
                cy += 1;
            }
        }
    }

    generateMobs(id) {
        const lv = this.levels[id];
        // Minerio Mobs
        const mobPool = [
            { char: TILE_TYPES.SPORE, color: 'p', name: 'Walking Spore' },
            { char: TILE_TYPES.SHELL_HIDE, color: 'y', name: 'Shell Hide' }
        ];

        for (let i = 0; i < 120; i++) {
            const rx = Math.floor(Math.random() * lv.width);
            const ry = Math.floor(Math.random() * lv.height);
            const tile = this.getTile(rx, ry, id);
            if (tile.char === TILE_TYPES.DIRT || tile.char === TILE_TYPES.GRASS) {
                const type = mobPool[Math.floor(Math.random() * mobPool.length)];
                lv.mobs.push({
                    x: rx, y: ry,
                    char: type.char,
                    color: type.color,
                    name: type.name,
                    vx: 0, vy: 0
                });
            }
        }
    }

    generateSporeColony(id) {
        const lv = this.levels[id];
        const cx = Math.floor(lv.width / 2);
        const cy = Math.floor(lv.height / 2);

        // --- 1. The Citadel (Castle) ---
        // Stone Walls 60x60
        const castleR = 30;
        for (let y = cy - castleR; y <= cy + castleR; y++) {
            for (let x = cx - castleR; x <= cx + castleR; x++) {
                // Moat
                const dist = Math.max(Math.abs(x - cx), Math.abs(y - cy));
                if (dist === castleR + 2 || dist === castleR + 3) {
                    this.setTile(x, y, TILE_TYPES.WATER, 'b', id);
                }
                // Walls
                if (dist === castleR) {
                    // Gate
                    if (y === cy + castleR && x >= cx - 2 && x <= cx + 2) {
                        this.setTile(x, y, TILE_TYPES.PLANKS, 'u', id); // Drawbridge
                    } else {
                        this.setTile(x, y, TILE_TYPES.STONE, 'w', id);
                    }
                }
                // Courtyard
                if (dist < castleR) {
                    this.setTile(x, y, TILE_TYPES.GRASS, 'g', id);
                }
            }
        }

        // The Keep (Central Building)
        const keepR = 10;
        this.drawBuilding(cx - keepR, cy - keepR, keepR * 2, keepR * 2, TILE_TYPES.STONE, 'w', TILE_TYPES.PLANKS, 'w', id);
        this.setSign(cx, cy + keepR + 1, "Citadel Keep", id);
        this.setTile(cx, cy, TILE_TYPES.GROMP, 'G', id); // The King/Boss

        // --- 2. Town Grid (South of Citadel) ---
        const startY = cy + castleR + 10;
        const streetW = 4;

        // Main Street
        for (let y = startY; y < startY + 60; y++) {
            for (let x = cx - 2; x <= cx + 2; x++) {
                this.setTile(x, y, TILE_TYPES.DIRT, 'u', id); // Paved Road
            }
        }

        // Housing Blocks
        const blockW = 12;
        const blockH = 10;

        // Left Side
        for (let i = 0; i < 3; i++) {
            const hx = cx - 15 - blockW;
            const hy = startY + i * (blockH + 4);
            this.drawHouse(hx, hy, blockW, blockH, id);
        }

        // Right Side
        for (let i = 0; i < 3; i++) {
            const hx = cx + 15;
            const hy = startY + i * (blockH + 4);
            this.drawHouse(hx, hy, blockW, blockH, id);
        }

        // --- 3. Farms (West of Town) ---
        const farmX = cx - 60;
        const farmY = startY;

        for (let i = 0; i < 2; i++) {
            const fy = farmY + i * 25;
            this.drawFarm(farmX, fy, 20, 20, id);
        }

        // --- 4. Entrance to Deep Mycelium ---
        // Moved to side of Keep
        this.setTile(cx + 8, cy - 8, TILE_TYPES.STAIR_DOWN, 'r', id);
        this.setSign(cx + 9, cy - 8, "Dungeon Entrance", id);
    }

    drawHouse(x, y, w, h, id) {
        // Wood Walls, Planks Floor
        this.drawBuilding(x, y, w, h, TILE_TYPES.WOOD, 'u', TILE_TYPES.PLANKS, 'u', id);
        // Door
        this.setTile(x + Math.floor(w / 2), y + h - 1, TILE_TYPES.DOOR, 'u', id);

        // Roof (z=1) - Simple fill for now
        this.drawRect(x, y, w, h, TILE_TYPES.WOOD, 'r', id, 1); // Red Roof
    }

    drawFarm(x, y, w, h, id) {
        // Fences (Wood Walls for now, maybe specific Fence type later)
        this.drawRect(x, y, w, h, TILE_TYPES.WOOD, 'y', id);
        // Gate
        this.setTile(x + Math.floor(w / 2), y + h - 1, TILE_TYPES.DOOR, 'u', id);

        // Crops
        for (let fy = y + 1; fy < y + h - 1; fy++) {
            for (let fx = x + 1; fx < x + w - 1; fx++) {
                this.setTile(fx, fy, TILE_TYPES.DIRT, 'D', id);
                if (Math.random() > 0.6) {
                    this.setTile(fx, fy, TILE_TYPES.MUSHROOM, 'p', id);
                }
            }
        }
    }

    drawBuilding(x, y, w, h, wallChar, wallColor, floorChar, floorColor, id) {
        // Walls
        this.drawRect(x, y, w, h, wallChar, wallColor, id);

        // Floor
        for (let fy = y + 1; fy < y + h - 1; fy++) {
            for (let fx = x + 1; fx < x + w - 1; fx++) {
                this.setTile(fx, fy, floorChar, floorColor, id);
            }
        }
    }

    drawRect(x, y, w, h, char, color, id, z = 0) {
        for (let i = 0; i < w; i++) {
            this.setTile(x + i, y, char, color, id, z);
            this.setTile(x + i, y + h - 1, char, color, id, z);
        }
        for (let i = 0; i < h; i++) {
            this.setTile(x, y + i, char, color, id, z);
            this.setTile(x + w - 1, y + i, char, color, id, z);
        }
    }

    // Legacy helpers removed or refactored above
    drawElderTree(x, y, id) { }
    drawMushroomHut(x, y, id) { }
    drawShop(x, y, name, symbol, color, id) { }

    generateDungeon(id) {
        const lv = this.levels[id];
        const rooms = [];
        const split = (x, y, w, h, depth) => {
            if (depth <= 0 || (w < 12 && h < 12)) {
                rooms.push({ x, y, w, h });
                return;
            }
            if (w > h) {
                const sw = Math.floor(w * (0.3 + Math.random() * 0.4));
                split(x, y, sw, h, depth - 1);
                split(x + sw, y, w - sw, h, depth - 1);
            } else {
                const sh = Math.floor(h * (0.3 + Math.random() * 0.4));
                split(x, y, w, sh, depth - 1);
                split(x, y + sh, w, h - sh, depth - 1);
            }
        };

        split(2, 2, lv.width - 4, lv.height - 4, 4);

        rooms.forEach((r, idx) => {
            const rw = Math.floor(r.w * 0.8);
            const rh = Math.floor(r.h * 0.8);
            const rx = r.x + Math.floor((r.w - rw) / 2);
            const ry = r.y + Math.floor((r.h - rh) / 2);

            for (let j = ry; j < ry + rh; j++) {
                for (let i = rx; i < rx + rw; i++) {
                    const char = Math.random() > 0.05 ? TILE_TYPES.DIRT : (Math.random() > 0.5 ? TILE_TYPES.GOLD : TILE_TYPES.POTION);
                    const color = char === TILE_TYPES.GOLD ? 'y' : (char === TILE_TYPES.POTION ? 'r' : 'D');
                    this.setTile(i, j, char, color, id);
                }
            }

            if (idx < rooms.length - 1) {
                const r2 = rooms[idx + 1];
                this.digCorridor(rx + Math.floor(rw / 2), ry + Math.floor(rh / 2),
                    r2.x + Math.floor(r2.w / 2), r2.y + Math.floor(r2.h / 2), id);
            }

            // Scatter Mobs
            if (Math.random() > 0.3) {
                const mx = rx + 2 + Math.floor(Math.random() * (rw - 4));
                const my = ry + 2 + Math.floor(Math.random() * (rh - 4));
                const monsterPool = [TILE_TYPES.SPORE, TILE_TYPES.SHELL_HIDE];
                this.setTile(mx, my, monsterPool[Math.floor(Math.random() * monsterPool.length)], 'p', id);
            }
        });

        const first = rooms[0];
        this.setTile(first.x + Math.floor(first.w / 2), first.y + Math.floor(first.h / 2), TILE_TYPES.STAIR_UP, 'b', id);
    }

    digCorridor(x1, y1, x2, y2, id) {
        let cx = x1, cy = y1;
        while (cx !== x2) {
            this.setTile(cx, cy, TILE_TYPES.DIRT, 'D', id);
            cx += (x2 > cx) ? 1 : -1;
        }
        while (cy !== y2) {
            this.setTile(cx, cy, TILE_TYPES.DIRT, 'D', id);
            cy += (y2 > cy) ? 1 : -1;
        }
    }

    regenerateTile(x, y, id) {
        const lv = this.levels[id];
        // Re-run generation logic for this single coordinate
        // This is an approximation since original gen was iterative/stateful for some things
        // But for "Terrain" it works well enough.

        const biome = this.getBiome(x, y);
        // Simple Hash for "Randomness" based on coordinate to keep it stable-ish
        const pseudoRandom = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        const n = pseudoRandom;

        if (id === 'fungal_caverns') {
            if (biome === 'FUNGAL_JUNGLE') {
                if (n > 0.96) this.setTile(x, y, TILE_TYPES.TREE, 'o', id);
                else if (n > 0.92) this.setTile(x, y, TILE_TYPES.MUSHROOM, 'p', id);
                else if (n > 0.85) this.setTile(x, y, TILE_TYPES.GRASS, 'g', id);
                else this.setTile(x, y, TILE_TYPES.DIRT, 'D', id);
            } else if (biome === 'SPORE_WASTES') {
                if (n > 0.98) this.setTile(x, y, TILE_TYPES.MOUNTAIN, 's', id);
                else if (n > 0.90) this.setTile(x, y, TILE_TYPES.RUBBLE, 's', id);
                else this.setTile(x, y, TILE_TYPES.DIRT, 'u', id);
            } else {
                if (n > 0.99) this.setTile(x, y, TILE_TYPES.STONE, 's', id);
                else if (n > 0.95) this.setTile(x, y, TILE_TYPES.MUSHROOM, 'o', id);
                else this.setTile(x, y, TILE_TYPES.DIRT, 'D', id);
            }
        }
        // Future: Handle other levels
    }
}
