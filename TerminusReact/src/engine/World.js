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
    WOOD: 'W',      // GRANITE/WOOD
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
            signs: {}
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

        // Colony Plaza
        for (let y = cy - 20; y < cy + 20; y++) {
            for (let x = cx - 20; x < cx + 20; x++) {
                if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) < 20) {
                    this.setTile(x, y, TILE_TYPES.WOOD, 'u', id); // Wooden Plaza
                }
            }
        }

        this.setSign(cx + 2, cy + 2, "Spore Colony - Safe Haven", id);
        this.setTile(cx, cy, TILE_TYPES.FOUNTAIN, 'b', id);

        // Trade District
        this.drawShop(cx - 30, cy - 10, 'Supply', '1', 'U', id); // Mining Supplies

        // The Elder Tree (Citadel equivalent)
        this.drawElderTree(cx, cy - 60, id);

        // Organic Mushroom Homes
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 35 + Math.random() * 60;
            const hx = Math.floor(cx + Math.cos(angle) * dist);
            const hy = Math.floor(cy + Math.sin(angle) * dist);
            this.drawMushroomHut(hx, hy, id);
        }

        // Entrance to Deep Mycelium
        this.setTile(cx, cy + 80, TILE_TYPES.STAIR_DOWN, 'r', id);
        this.drawRect(cx - 2, cy + 78, 5, 5, TILE_TYPES.STONE, 's', id);
        this.setSign(cx + 3, cy + 80, "Danger: Deep Mycelium Layer", id);
    }

    drawElderTree(x, y, id) {
        // Giant central mushroom/tree structure
        const radius = 15;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy < radius * radius) {
                    this.setTile(x + dx, y + dy, TILE_TYPES.WOOD, 'U', id);
                }
            }
        }
        this.setTile(x, y, TILE_TYPES.GROMP, 'G', id); // The Elder
    }

    drawMushroomHut(x, y, id) {
        this.setTile(x, y, TILE_TYPES.MUSHROOM, 'o', id);
        this.setTile(x, y + 1, TILE_TYPES.DOOR, 'u', id);
    }

    drawShop(x, y, name, symbol, color, id) {
        this.drawRect(x - 3, y - 3, 7, 7, TILE_TYPES.WOOD, 'u', id);
        this.setTile(x, y, symbol, color, id);
        this.setTile(x, y + 3, TILE_TYPES.DOOR, 'u', id);
    }

    drawRect(x, y, w, h, char, color, id) {
        for (let i = 0; i < w; i++) {
            this.setTile(x + i, y, char, color, id);
            this.setTile(x + i, y + h - 1, char, color, id);
        }
        for (let i = 0; i < h; i++) {
            this.setTile(x, y + i, char, color, id);
            this.setTile(x + w - 1, y + i, char, color, id);
        }
    }

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
}
