/**
 * TERMINUS ANSI Renderer (React Version)
 * Draws a grid of characters to a canvas with foreground and background colors.
 */

export const COLORS = {
    'D': '#331100', // DIRT_DARK as default floor
    'w': '#AAAAAA', // LIGHT_GRAY
    's': '#555555', // DARK_GRAY (Stone)
    'o': '#FF6347', // MUSHROOM
    'r': '#AA0000', // RED
    'g': '#00AA00', // GREEN
    'b': '#0000AA', // BLUE
    'u': '#AA5500', // BROWN (Wood)
    'W': '#FFF',    // WHITE
    'y': '#FFFF55', // YELLOW
    'G': '#55FF55', // LIGHT_GREEN
    'B': '#5555FF', // LIGHT_BLUE
    'U': '#4B3621', // Rotten Wood
    'p': '#AA00AA', // MAGENTA (Spore)
    'v': '#2a002a', // DEEP_PURPLE (Void/BG)
    't': '#00AAAA', // CYAN
    'T': '#55FFFF', // LIGHT_CYAN
    'i': '#FFD700', // GOLD (Light source)
    'z': '#222222', // STONE_DARK
    'black': '#050505' // VOID
};

export class Renderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.baseCharWidth = 8;
        this.baseCharHeight = 16;
        this.upscale = 1;
        this.zoomLevel = 1.0; // Added zoom state
        this.charWidth = 8;
        this.charHeight = 16;
        this.cols = 0;
        this.rows = 0;
    }

    attach(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.resize();
    }

    resize() {
        if (!this.canvas) return;

        const winW = window.innerWidth;
        const winH = window.innerHeight;

        // Calculate power-of-2 upscale (1, 2, 4, 8...)
        let s = 1;
        while ((this.baseCharHeight * s * 2) < (winH / 10) && s < 8) {
            s *= 2;
        }

        // Halve the "ideal" scale for denser pixel look
        this.upscale = Math.max(1, s / 2);

        // Apply Zoom
        const finalScale = this.upscale * this.zoomLevel;

        this.charWidth = this.baseCharWidth * finalScale;
        this.charHeight = this.baseCharHeight * finalScale;

        this.cols = Math.ceil(winW / this.charWidth);
        this.rows = Math.ceil(winH / this.charHeight);

        this.canvas.width = winW;
        this.canvas.height = winH;

        this.ctx.font = `${this.charHeight}px 'VT323', monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.imageSmoothingEnabled = false;
    }

    setZoom(delta) {
        // Delta is +/- 0.1
        const newZoom = Math.max(0.5, Math.min(4.0, this.zoomLevel + delta));
        this.zoomLevel = newZoom;
        this.resize();
    }

    clear() {
        if (!this.ctx) return;
        this.ctx.fillStyle = COLORS.black;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawChar(x, y, char, color = 'w', bgColor = 'black') {
        if (!this.ctx) return;
        const px = x * this.charWidth;
        const py = y * this.charHeight;

        // Draw Background
        if (bgColor !== 'black') {
            this.ctx.fillStyle = COLORS[bgColor] || bgColor;
            this.ctx.fillRect(px, py, this.charWidth, this.charHeight);
        }

        // Draw Character
        this.ctx.fillStyle = COLORS[color] || color;
        this.ctx.fillText(char, px + this.charWidth / 2, py + this.charHeight / 2);
    }

    drawText(x, y, text, color = 'w', bgColor = 'black') {
        for (let i = 0; i < text.length; i++) {
            this.drawChar(x + i, y, text[i], color, bgColor);
        }
    }

    drawOverlay(x, y, color, alpha = 0.5) {
        if (!this.ctx) return;
        const px = x * this.charWidth;
        const py = y * this.charHeight;
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = COLORS[color] || color;
        this.ctx.fillRect(px, py, this.charWidth, this.charHeight);
        this.ctx.restore();
    }

    drawGlobalFilter(color, alpha = 0.2) {
        if (!this.ctx) return;
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = COLORS[color] || color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    renderWorld(world, player, remotePlayers = new Map(), time = 0, atmosphere = { type: 'none' }) {
        if (!this.ctx || !this.canvas) return;
        this.clear();

        const level = world.level;
        // Camera Clamping
        const camX = Math.max(0, Math.min(level.width - this.cols, player.camera.x - Math.floor(this.cols / 2)));
        const camY = Math.max(0, Math.min(level.height - this.rows, player.camera.y - Math.floor(this.rows / 2)));

        // Debug Log (Throttled)
        if (Math.random() < 0.01) {
            console.log(`[Render] Cam: ${camX},${camY} | Player: ${player.x},${player.y} | Lvl: ${world.currentLevel} | Z: ${player.z}`);
            console.log(`[Render] Explored(Player): ${world.isExplored(player.x, player.y)}`);
        }

        // Update player camera reference for UI/LookMode
        player.camera.x = camX;
        player.camera.y = camY;

        const startX = camX;
        const startY = camY;
        const endX = Math.min(level.width, camX + this.cols);
        const endY = Math.min(level.height, camY + this.rows);

        // 1. Ground Floor (Dimmed) if z > 0
        if (player.z > 0) {
            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    if (!world.isExplored(x, y, world.currentLevel, 0)) continue;
                    const tile = world.getTile(x, y, world.currentLevel, 0);
                    if (tile.char !== ' ') {
                        this.drawChar(x - camX, y - camY, tile.char, 'D');
                    }
                }
            }
            this.drawGlobalFilter('black', 0.4);
        }

        // 2. Current Storey
        const z = player.z;
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (!world.isExplored(x, y, world.currentLevel, z)) continue;
                const tile = world.getTile(x, y, world.currentLevel, z);
                if (tile.char !== ' ') {
                    this.drawChar(x - camX, y - camY, tile.char, tile.color);
                }
            }
        }

        // 3. Remote Players
        for (const [id, p] of remotePlayers) {
            if (p.level === world.currentLevel && (p.z || 0) === z) {
                this.drawChar(p.x - camX, p.y - camY, p.char, 'B');
            }
        }

        // 4. Mobs
        world.level.mobs.forEach(m => {
            if (world.isExplored(m.x, m.y)) {
                this.drawChar(m.x - camX, m.y - camY, m.char, m.color);
            }
        });

        // 5. Local Player
        this.drawChar(player.x - camX, player.y - camY, player.char, player.color);

        // 6. Atmosphere
        this.drawAtmosphere(world, player, camX, camY, time, atmosphere);
    }

    drawAtmosphere(world, player, camX, camY, time, atmosphere) {
        if (!this.ctx) return;
        const level = world.level;
        const startX = camX;
        const startY = camY;
        const endX = Math.min(level.width, camX + this.cols);
        const endY = Math.min(level.height, camY + this.rows);

        // Light Sources (Torches/Lamps)
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = world.getTile(x, y, world.currentLevel, player.z);
                if (tile.char === 'i' || tile.char === 'o') {
                    const flicker = tile.char === 'i' ? (1.0 + Math.sin(time * 12) * 0.1 * Math.random()) : 1.0;
                    const radius = tile.char === 'i' ? 4 * flicker : 6;
                    const color = tile.char === 'i' ? 'rgba(255,200,100,0.3)' : 'rgba(100,200,255,0.2)';

                    for (let ly = -radius; ly <= radius; ly++) {
                        for (let lx = -radius; lx <= radius; lx++) {
                            const dSq = lx * lx + ly * ly;
                            if (dSq < radius * radius) {
                                const ctxX = (x + lx) - camX;
                                const ctxY = (y + ly) - camY;
                                if (ctxX >= 0 && ctxX < this.cols && ctxY >= 0 && ctxY < this.rows) {
                                    const strength = (1.0 - Math.sqrt(dSq) / radius) * 0.4;
                                    this.drawOverlay(ctxX, ctxY, ' ', strength, color); // Use color directly
                                }
                            }
                        }
                    }
                }
            }
        }

        // Global Effects
        // Global Effects
        if (atmosphere.type === 'fog') {
            this.drawGlobalFilter('W', 0.03); // Reduced from 0.1
        } else if (atmosphere.type === 'spooky') {
            this.drawGlobalFilter('p', 0.1);
            if (Math.sin(time * 5) > 0.8) this.drawGlobalFilter('black', 0.05);
        }
    }
}
