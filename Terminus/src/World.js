/**
 * TERMINUS World Manager
 * Handles multi-level storage, static hubs, and procedural generation.
 * Utilizes a wide range of ASCII symbols for a rich roguelike experience.
 */

import { Noise } from './engine/Noise.js';

export const TILE_TYPES = {
    // Terrain
    VOID: ' ',
    FLOOR: '.',
    WALL: '#',
    PERM_WALL: 'X',
    GRANITE: 'W',
    BRICK: '%',
    DOOR: '+',
    OPEN_DOOR: "'",
    STAIR_UP: '<',
    STAIR_DOWN: '>',
    TREE: 'T',
    GRASS: '"',
    WATER: '~',
    LAVA: '`',
    MOUNTAIN: '^',
    SAND: 's',
    LOG: 'L',
    RUBBLE: ':',
    ICE: '{',
    MARBLE: 'M',

    // Entities (Generic symbols for NPCs/Mobs)
    PLAYER: '@',
    KING: 'K',
    GUARD: 'k',
    MERCHANT: 'S',
    DRAGON: 'D',
    ORC: 'O',
    GOBLIN: 'g',
    SKELETON: 'z',
    DEMON: '&',
    GHOST: 'v',
    SPIDER: 's',
    RAT: 'r',
    BAT: 'b',
    TORCH: 'i',
    MESE_LAMP: 'o',
    IRON_SCRAP: 'm',
    WOOD: 'y',
    HOE: 'J',

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
    CANDLE: ';', // Let's change CANDLE to something else if we use ; for SOIL
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
    // Mobs
    DEER: 'd',
    SHEEP: 's',
    BIRD: 'b',
    COW: 'C',
    RABBIT: 'r'
};

export class World {
    constructor(width = 400, height = 400) {
        this.width = width;
        this.height = height;
        this.levels = {}; // id -> { id, grid, colors, explored, width, height }
        this.currentLevel = 'town';
        this.noise = new Noise(Math.random());
        this.biomeNoise = new Noise(Math.random() + 100);
        this.moatNoise = new Noise(Math.random() + 200);

        this.createLevel('town', 400, 400);
        this.generateWilderness('town');
        this.generateTown('town');

        this.createLevel('dungeon_1', 100, 100);
        this.generateDungeon('dungeon_1');
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
            this.setTile(x, y, TILE_TYPES.SIGN, 'U', id); // Light Umber/Brown
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
        // Multi-octave biome noise
        const scale = 0.05;
        const n1 = this.biomeNoise.get(x * scale, y * scale);
        const n2 = this.biomeNoise.get(x * scale * 2, y * scale * 2) * 0.5;
        const val = n1 + n2;

        if (val < -0.3) return 'WASTELAND';
        if (val > 0.4) return 'VOLCANIC';
        return 'TEMPERATE';
    }

    generateWilderness(id) {
        const lv = this.levels[id];
        for (let y = 0; y < lv.height; y++) {
            for (let x = 0; x < lv.width; x++) {
                const biome = this.getBiome(x, y);
                const n = Math.random();

                if (biome === 'VOLCANIC') {
                    if (n > 0.96) this.setTile(x, y, TILE_TYPES.MOUNTAIN, 'r', id); // Red mountains
                    else if (n > 0.92) this.setTile(x, y, TILE_TYPES.LAVA, 'R', id);
                    else if (n > 0.85) this.setTile(x, y, TILE_TYPES.BRICK, 'D', id); // Charred ground
                    else this.setTile(x, y, TILE_TYPES.FLOOR, 'D', id); // Ash floor
                } else if (biome === 'WASTELAND') {
                    if (n > 0.98) this.setTile(x, y, TILE_TYPES.MOUNTAIN, 'y', id);
                    else if (n > 0.90) this.setTile(x, y, TILE_TYPES.SAND, 'y', id);
                    else if (n > 0.80) this.setTile(x, y, TILE_TYPES.RUBBLE, 'w', id);
                    else this.setTile(x, y, TILE_TYPES.FLOOR, 'y', id);
                } else {
                    // Temperate (Standard)
                    if (n > 0.99) this.setTile(x, y, TILE_TYPES.MOUNTAIN, 'W', id);
                    else if (n > 0.95) this.setTile(x, y, TILE_TYPES.TREE, 'G', id);
                    else if (n > 0.90) this.setTile(x, y, TILE_TYPES.GRASS, 'g', id);
                    else this.setTile(x, y, TILE_TYPES.FLOOR, 'D', id);
                }
            }
        }

        this.generateRivers(id);
        this.generateChasms(id);
        this.generateWildernessMobs(id);

        // Add random Mese Lamps in wilderness for fun
        for (let i = 0; i < 20; i++) {
            const rx = Math.floor(Math.random() * lv.width);
            const ry = Math.floor(Math.random() * lv.height);
            this.setTile(rx, ry, TILE_TYPES.MESE_LAMP, 'c', id);
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
                        this.setTile(tx, Math.floor(cy), TILE_TYPES.WATER, 'B', id);
                    }
                }
                cx += Math.sin(cy * 0.1) * 2 + drift;
                cy += 1;
            }
        }
    }

    generateChasms(id) {
        const lv = this.levels[id];
        for (let i = 0; i < 5; i++) {
            let cx = Math.random() * lv.width;
            let cy = Math.random() * lv.height;
            const len = 20 + Math.random() * 40;
            for (let step = 0; step < len; step++) {
                const rw = 1 + Math.floor(Math.random() * 2);
                for (let dx = -rw; dx <= rw; dx++) {
                    const tx = Math.floor(cx + dx);
                    const ty = Math.floor(cy);
                    if (tx >= 0 && tx < lv.width && ty >= 0 && ty < lv.height) {
                        this.setTile(tx, ty, ':', 'D', id);
                    }
                }
                cx += (Math.random() - 0.5) * 2;
                cy += (Math.random() - 0.5) * 2;
            }
        }
    }

    generateWildernessMobs(id) {
        const lv = this.levels[id];
        const animalPool = [
            { char: TILE_TYPES.DEER, color: 'u', name: 'Deer' },
            { char: TILE_TYPES.SHEEP, color: 'w', name: 'Sheep' },
            { char: TILE_TYPES.COW, color: 'w', name: 'Cow' },
            { char: TILE_TYPES.RABBIT, color: 'w', name: 'Rabbit' },
            { char: TILE_TYPES.BIRD, color: 'b', name: 'Bird' }
        ];

        for (let i = 0; i < 100; i++) {
            const rx = Math.floor(Math.random() * lv.width);
            const ry = Math.floor(Math.random() * lv.height);
            const tile = this.getTile(rx, ry, id);
            if (tile.char === TILE_TYPES.FLOOR || tile.char === TILE_TYPES.GRASS) {
                const type = animalPool[Math.floor(Math.random() * animalPool.length)];
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

    generateFarm(x, y, w, h, id) {
        for (let fy = 0; fy < h; fy++) {
            for (let fx = 0; fx < w; fx++) {
                this.setTile(x + fx, y + fy, TILE_TYPES.SOIL, 's', id);
            }
        }
    }

    updateCrops() {
        const lv = this.level;
        for (let y = 0; y < lv.height; y++) {
            for (let x = 0; x < lv.width; x++) {
                const char = lv.grid[y][x];
                if (char === TILE_TYPES.SOIL || char === TILE_TYPES.SPROUT || char === TILE_TYPES.PLANT) {
                    if (Math.random() > 0.9995) { // Slow growth
                        if (char === TILE_TYPES.SOIL) this.setTile(x, y, TILE_TYPES.SPROUT, 'g');
                        else if (char === TILE_TYPES.SPROUT) this.setTile(x, y, TILE_TYPES.PLANT, 'g');
                        else if (char === TILE_TYPES.PLANT) this.setTile(x, y, TILE_TYPES.HARVEST, 'y');
                    }
                }
            }
        }
    }

    updateMobs() {
        const lv = this.level;
        lv.mobs.forEach(m => {
            if (Math.random() > 0.95) {
                const dx = Math.floor(Math.random() * 3) - 1;
                const dy = Math.floor(Math.random() * 3) - 1;
                const nx = m.x + dx;
                const ny = m.y + dy;
                const tile = this.getTile(nx, ny);
                if (tile.char === TILE_TYPES.FLOOR || tile.char === TILE_TYPES.GRASS) {
                    m.x = nx;
                    m.y = ny;
                }
            }
        });
    }

    generateTown(id) {
        const lv = this.levels[id];
        const cx = Math.floor(lv.width / 2);
        const cy = Math.floor(lv.height / 2);

        // --- ORGANIC TOWN REDESIGN ---
        // 1. Cobblestone Main Street (East-West)
        const streetWidth = 4;
        for (let x = 0; x < lv.width; x++) {
            for (let y = cy - streetWidth; y <= cy + streetWidth; y++) {
                if (y > 0 && y < lv.height) {
                    const sway = Math.sin(x * 0.05) * 3;
                    if (Math.abs(y - (cy + sway)) < streetWidth) {
                        this.setTile(x, y, TILE_TYPES.GRANITE, 's', id);
                    }
                }
            }
        }

        // 2. Central Plaza
        for (let y = cy - 20; y < cy + 20; y++) {
            for (let x = cx - 20; x < cx + 20; x++) {
                if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) < 20) {
                    this.setTile(x, y, TILE_TYPES.GRANITE, 's', id);
                }
            }
        }

        this.drawCastle(cx, cy - 80, id); // Moved North
        this.setTile(cx, cy, TILE_TYPES.FOUNTAIN, 'B', id);

        // Town Signs
        this.setSign(cx + 2, cy + 2, "Town Square - Welcome to Terminus!", id);
        this.setSign(cx, cy - 8, "NORTH: The Citadel", id);

        // 3. Districts & Zoning
        // West District: Trade (General, Farm, Vegan)
        this.drawShop(cx - 30, cy - 10, 'General', '1', 'U', id);
        this.setTile(cx - 20, cy - 15, TILE_TYPES.SHOP, 'g', id); // Vegan
        this.generateFarm(cx - 40, cy - 25, 8, 6, id);

        // East District: Magic & War (Armor, Magic, Alchemy)
        this.drawShop(cx + 30, cy - 10, 'Armor', '2', 's', id);
        this.drawShop(cx + 25, cy + 15, 'Alchemy', '5', 'b', id);
        this.drawShop(cx + 45, cy + 15, 'Magic', '6', 'r', id);

        // South District: Industry (Forge)
        this.drawShop(cx, cy + 25, 'Forge', TILE_TYPES.FORGE, 'y', id);

        // The Bank (In Plaza)
        this.setTile(cx - 10, cy + 5, TILE_TYPES.BANK, 'fb0', id);

        // 4. Organic Residential Zoning
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 35 + Math.random() * 60;
            const hx = Math.floor(cx + Math.cos(angle) * dist);
            const hy = Math.floor(cy + Math.sin(angle) * dist);
            // Avoid water
            const tile = this.getTile(hx, hy, id);
            if (tile.char !== TILE_TYPES.WATER && tile.char !== TILE_TYPES.WALL) {
                this.drawHouse(hx, hy, id);
            }
        }

        // Entrance to Underworld (Far South)
        this.setTile(cx, cy + 80, TILE_TYPES.STAIR_DOWN, 'r', id);
        this.drawRect(cx - 2, cy + 78, 5, 5, TILE_TYPES.WALL, 'D', id);
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
                    const char = Math.random() > 0.05 ? TILE_TYPES.FLOOR : (Math.random() > 0.5 ? TILE_TYPES.GOLD : TILE_TYPES.POTION);
                    const color = char === TILE_TYPES.GOLD ? 'y' : (char === TILE_TYPES.POTION ? 'r' : 'w');
                    this.setTile(i, j, char, color, id);
                }
            }

            if (idx < rooms.length - 1) {
                const r2 = rooms[idx + 1];
                this.digCorridor(rx + Math.floor(rw / 2), ry + Math.floor(rh / 2),
                    r2.x + Math.floor(r2.w / 2), r2.y + Math.floor(r2.h / 2), id);
            }

            // Scatter some monsters
            if (Math.random() > 0.3) {
                const mx = rx + 2 + Math.floor(Math.random() * (rw - 4));
                const my = ry + 2 + Math.floor(Math.random() * (rh - 4));
                const monsterPool = [TILE_TYPES.ORC, TILE_TYPES.GOBLIN, TILE_TYPES.SKELETON, TILE_TYPES.SPIDER];
                this.setTile(mx, my, monsterPool[Math.floor(Math.random() * monsterPool.length)], 'R', id);
            }
        });

        const first = rooms[0];
        this.setTile(first.x + Math.floor(first.w / 2), first.y + Math.floor(first.h / 2), TILE_TYPES.STAIR_UP, 'b', id);
    }

    digCorridor(x1, y1, x2, y2, id) {
        let cx = x1, cy = y1;
        while (cx !== x2) {
            this.setTile(cx, cy, TILE_TYPES.FLOOR, 'D', id);
            cx += (x2 > cx) ? 1 : -1;
        }
        while (cy !== y2) {
            this.setTile(cx, cy, TILE_TYPES.FLOOR, 'D', id);
            cy += (y2 > cy) ? 1 : -1;
        }
    }

    drawCastle(x, y, id) {
        // --- CITADEL REDESIGN ---
        // 1. The Moat
        const moatRadius = 35;
        for (let dy = -moatRadius; dy <= moatRadius; dy++) {
            for (let dx = -moatRadius; dx <= moatRadius; dx++) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                // Irregular moat edge
                const noise = this.moatNoise.get((x + dx) * 0.1, (y + dy) * 0.1) * 5;
                if (dist > 28 + noise && dist < 34 + noise) {
                    this.setTile(x + dx, y + dy, TILE_TYPES.WATER, 'B', id);
                }
            }
        }

        // 2. The Keep (Citadel)
        const w = 24, h = 20;
        const left = x - w / 2, top = y - h / 2;

        // Outer Walls
        this.drawRect(left, top, w, h, TILE_TYPES.WALL, 'W', id);

        // Drawbridge (South)
        for (let i = -2; i <= 2; i++) {
            this.setTile(x + i, top + h, TILE_TYPES.DOOR, 'y', id); // BRIDGE
            this.setTile(x + i, top + h + 1, TILE_TYPES.DOOR, 'y', id);
            this.setTile(x + i, top + h + 2, TILE_TYPES.DOOR, 'y', id);
        }

        // Floor fill
        for (let j = top + 1; j < top + h - 1; j++) {
            for (let i = left + 1; i < left + w - 1; i++) {
                this.setTile(i, j, TILE_TYPES.FLOOR, 'w', id);
            }
        }

        // Throne Room
        this.setTile(x, top + 5, TILE_TYPES.KING, 'y', id);
        this.setTile(x - 2, top + 5, TILE_TYPES.GUARD, 's', id);
        this.setTile(x + 2, top + 5, TILE_TYPES.GUARD, 's', id);

        // Dining Hall
        for (let i = x - 6; i <= x + 6; i++) {
            this.setTile(i, top + 12, TILE_TYPES.LOG, 'u', id); // Table
        }

        // Castle Interior Signs
        this.setSign(x + 5, top + 15, "War Room: Defense of the Realm", id);
        this.setSign(x - 8, top + 8, "Royal Guest Quarters", id);
    }

    drawShop(x, y, name, symbol, color, id) {
        this.drawRect(x - 3, y - 3, 7, 7, TILE_TYPES.BRICK, 'o', id);
        for (let j = y - 2; j <= y + 2; j++) {
            for (let i = x - 2; i <= x + 2; i++) {
                this.setTile(i, j, TILE_TYPES.FLOOR, 'D', id);
            }
        }
        this.setTile(x, y, symbol, color, id);
        this.setTile(x, y + 3, TILE_TYPES.DOOR, 'u', id);
    }

    drawHouse(x, y, id) {
        const w = 6 + Math.floor(Math.random() * 4);
        const h = 6 + Math.floor(Math.random() * 4);
        this.drawRect(Math.floor(x - w / 2), Math.floor(y - h / 2), w, h, TILE_TYPES.LOG, 'u', id);
        this.setTile(x, Math.floor(y + h / 2), TILE_TYPES.DOOR, 'u', id);
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
}
