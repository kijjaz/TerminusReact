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

        this.ctx.font = `bold ${this.charHeight}px 'Noto Sans Mono', monospace`;
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

        // 2. Render World Layers
        // We render Z levels relative to player.
        // If Player Z=0:
        //   1. Draw Z=0 (Ground/Floor)
        //   2. Draw Z=0 Entities
        //   3. Draw Z=1 (Roofs/Upper) with opacity logic
        //      - If player is 'under' Z=1 content (Inside), hide Z=1 locally?
        //      - "Immersive 3D": We draw Z=1 with a drop shadow offset.

        const pz = player.z;

        // --- Layer 0: Current Floor (pz) ---
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                // Visibility Check
                const isExplored = world.isExplored(x, y, world.currentLevel, pz);
                if (!isExplored) continue;

                const tile = world.getTile(x, y, world.currentLevel, pz);
                const isVisible = player.visible ? player.visible.has(`${x},${y}`) : true;

                if (tile.char !== ' ') {
                    if (isVisible) {
                        this.drawChar(x - camX, y - camY, tile.char, tile.color);
                    } else {
                        // Memory
                        this.drawChar(x - camX, y - camY, tile.char, 's');
                        this.drawOverlay(x - camX, y - camY, 'black', 0.6);
                    }
                }
            }
        }

        // --- Layer 0.5: Entities (Mobs/Player) ---
        // Rendered on top of floor, but below roofs
        // (Existing Mob Loop would go here, but passing it simply:)

        // --- Layer 1: Upper Floor / Roof (pz + 1) ---
        // "Immersive 3D" - only draw if we are NOT inside it?
        // Check if player is "covered" by a roof
        const playerTileAbove = world.getTile(Math.floor(player.x), Math.floor(player.y), world.currentLevel, pz + 1);
        const isIndoors = playerTileAbove.char !== ' ';

        if (!isIndoors) {
            // We are outside, so draw the roofs!
            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    const tileUp = world.getTile(x, y, world.currentLevel, pz + 1);
                    if (tileUp.char !== ' ') {
                        const isVisible = player.visible ? player.visible.has(`${x},${y}`) : true;
                        if (isVisible) {
                            // 3D Shadow Effect
                            // Draw a shadow 1 tile down/right to simulate height
                            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
                            const sx = (x - camX) * this.charWidth + 4;
                            const sy = (y - camY) * this.charHeight + 4;
                            this.ctx.fillRect(sx, sy, this.charWidth, this.charHeight);

                            // Draw Roof Tile
                            this.drawChar(x - camX, y - camY, tileUp.char, tileUp.color);
                        }
                    }
                }
            }
        } else {
            // We are INDOORS.
            // Visual Layer Tip: Maybe show transparent Roofs if we want "X-Ray"?
            // For now, simple Cutaway (Don't draw roofs at all, or draw them with high transparency?)
            // User said: "When user enters, they see current floor." -> Implies complete cutaway.
            // BUT, "Really immersive" might mean seeing neighbor roofs.
            // Let's draw neighbor roofs but NOT the ones overlapping the player? 
            // That's complex. Let's stick to "If Indoors, Hide ALL Roofs" for clarity first, 
            // OR "Hide Roofs in a radius around player".

            // Simple "Hide All" relative to view is classic Roguelike (Angband/CataDDA style).
        }


        // 3. Atmosphere (Fog/Lighting) - Render BEHIND players/mobs
        this.drawAtmosphere(world, player, camX, camY, time, atmosphere);

        // 4. Remote Players & Indicators
        for (const [id, p] of remotePlayers) {
            if (p.level !== world.currentLevel) continue;

            const px = p.x - camX;
            const py = p.y - camY;

            const inView = px >= 0 && px < this.cols && py >= 0 && py < this.rows;

            if (inView) {
                // Draw Player
                if ((p.z || 0) === z) {
                    this.drawChar(px, py, p.char, 'B'); // Blue for remote players
                }
            } else {
                // Draw Indicator (Radar)
                // Clamp to screen edges with 1 cell margin
                const ix = Math.max(1, Math.min(this.cols - 2, px));
                const iy = Math.max(1, Math.min(this.rows - 2, py));

                // Only show if reasonably close (e.g. < 100 tiles) to avoid noise? 
                // User asked for "nearby", let's say 50 tiles radius.
                const dx = p.x - player.x;
                const dy = p.y - player.y;
                if (dx * dx + dy * dy < 2500) { // 50^2
                    this.drawChar(ix, iy, '*', 'T'); // Cyan asterisk
                }
            }
        }

        // 4. Mobs
        // Use server mobs list from world.level.mobs if available?
        // GameEngine syncs it to world.level.mobs
        if (world.level && world.level.mobs) {
            world.level.mobs.forEach(m => {
                const key = `${Math.floor(m.x)},${Math.floor(m.y)}`;
                // Only draw if strictly visible to player (Line of Sight)
                if (player.visible && player.visible.has(key)) {
                    this.drawChar(m.x - camX, m.y - camY, m.char, m.color);
                } else if (!player.visible && world.isExplored(m.x, m.y)) {
                    // Fallback for legacy mode checks
                    // this.drawChar(m.x - camX, m.y - camY, m.char, m.color);
                }
            });
        }

        // 5. Local Player
        this.drawChar(player.x - camX, player.y - camY, player.char, player.color);

        // 6. Atmosphere

    }

    drawAtmosphere(world, player, camX, camY, time, atmosphere) {
        if (!this.ctx) return;
        const level = world.level;
        const startX = camX;
        const startY = camY;
        const endX = Math.min(level.width, camX + this.cols);
        const endY = Math.min(level.height, camY + this.rows);

        // 1. Static Sources (Lights)
        const lightSources = [];
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = world.getTile(x, y, world.currentLevel, player.z);
                if (tile.char === 'i') lightSources.push({ x, y, r: 8, c: [255, 200, 100] }); // Torch
                if (tile.char === 'o') lightSources.push({ x, y, r: 10, c: [100, 200, 255] }); // Lamp
            }
        }

        // 2. Dynamic Sources
        const rightHand = player.equipment && player.equipment.rightHand;
        if (rightHand && (rightHand.name.includes('Torch') || rightHand.name.includes('Lamp') || rightHand.name.includes('Pickaxe'))) {
            let radius = 4;
            let color = [200, 200, 200];
            if (rightHand.name.includes('Torch')) { radius = 12; color = [255, 180, 50]; }
            else if (rightHand.name.includes('Mese')) { radius = 14; color = [255, 255, 100]; }
            else if (rightHand.name.includes('Iron')) { radius = 6; color = [200, 200, 255]; }
            lightSources.push({ x: player.x, y: player.y, r: radius, c: color });
        }

        // 3. Draw Lights (Soft Glow Gradients - Reduced Opacity)
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen'; // Additive light
        lightSources.forEach(src => {
            const flicker = 1.0 + Math.sin(time * 10 + src.x) * 0.05 * Math.random();
            const radius = src.r * flicker;
            // Draw logic removed for brevity if no lights, but assuming we keep lights as gradient for now? 
            // User only complained about Fog. Let's keep lights as gradients unless requested otherwise.
            // Actually, let's keep lights simple.
            const px = (src.x - camX) * this.charWidth + this.charWidth / 2;
            const py = (src.y - camY) * this.charHeight + this.charHeight / 2;
            const pr = radius * this.charWidth;
            const g = this.ctx.createRadialGradient(px, py, 0, px, py, pr);
            g.addColorStop(0, `rgba(${src.c.join(',')}, 0.3)`);
            g.addColorStop(1, `rgba(${src.c.join(',')}, 0)`);
            this.ctx.fillStyle = g;
            this.ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
        });
        this.ctx.restore();

        // 4. Moving Fog (Soft Cloud Particles)
        // Reverted to Soft Gradients (v0.7) per user request ("No need to use ░")
        if (atmosphere.type === 'fog' || atmosphere.type === 'spooky') {
            const windSpeed = 2.0; // Tiles per second
            const offset = time * windSpeed;

            this.ctx.save();
            // Use 'source-over' for a subtle overlay.
            // 'screen' mode with white fog was washing out the black void.
            this.ctx.globalCompositeOperation = 'source-over';

            // Darker, subtle fog (Blue-Grey) instead of bright white
            const fogColor = atmosphere.type === 'spooky' ? '42, 0, 42' : '40, 50, 60';
            const particles = 12;

            for (let i = 0; i < particles; i++) {
                // Pseudo-random precise positions
                const rawX = (i * 123.45 + offset) % (this.cols + 40) - 20;
                const y = (i * 678.91) % (this.rows + 20) - 10;

                // Varying sizes
                const r = 15 + Math.sin(i * 32.1) * 10;

                // Draw Soft Gradient
                const px = rawX * this.charWidth;
                const py = y * this.charHeight;
                const pr = r * this.charWidth; // Radius in pixels

                // Radial Gradient for specific blob
                const g = this.ctx.createRadialGradient(px, py, 0, px, py, pr);
                // Tuned to 5% (0.05) - "Less distracting"
                g.addColorStop(0, `rgba(${fogColor}, 0.05)`); // Slightly legible center
                g.addColorStop(1, `rgba(${fogColor}, 0.0)`);   // Edge transparent

                this.ctx.fillStyle = g;
                this.ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
            }

            this.ctx.restore();
        }
    }

}
