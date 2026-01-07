/**
 * TERMINUS ANSI Renderer
 * Draws a grid of characters to a canvas with foreground and background colors.
 */

export const COLORS = {
    'D': '#333333', // Dark Gray
    'w': '#FFFFFF', // White
    's': '#888888', // Gray
    'o': '#FF8800', // Orange
    'r': '#FF0000', // Red
    'g': '#00FF00', // Green
    'b': '#0000FF', // Blue
    'u': '#884400', // Umber
    'W': '#CCCCCC', // Light Gray
    'y': '#FFFF00', // Yellow
    'G': '#88FF88', // Light Green
    'B': '#8888FF', // Light Blue
    'U': '#CC8844', // Light Umber
    'p': '#880088', // Purple
    'v': '#8800FF', // Violet
    't': '#008888', // Teal
    'T': '#00FFFF', // Light Teal
    'i': '#FF00FF', // Magenta
    'z': '#444488', // Blue Slate
    'black': '#000000'
};

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });

        // Base dimensions for the "original" bitmap font feel
        this.baseCharWidth = 8;
        this.baseCharHeight = 16;

        this.upscale = 1;
        this.charWidth = 8;
        this.charHeight = 16;

        this.cols = 0;
        this.rows = 0;
        this.resize();
    }

    resize() {
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        // Calculate power-of-2 upscale (1, 2, 4, 8...)
        // We want the text to be readable but keep the pixel chunkiness
        let s = 1;
        while ((this.baseCharHeight * s * 2) < (winH / 10) && s < 8) {
            s *= 2;
        }

        // Halve the "ideal" scale as per user request for a denser pixel look
        this.upscale = Math.max(1, s / 2);

        this.charWidth = this.baseCharWidth * this.upscale;
        this.charHeight = this.baseCharHeight * this.upscale;

        this.cols = Math.ceil(winW / this.charWidth);
        this.rows = Math.ceil(winH / this.charHeight);

        this.canvas.width = winW;
        this.canvas.height = winH;

        this.ctx.font = `${this.charHeight}px 'VT323', monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.imageSmoothingEnabled = false;
    }

    setZoom(factor) {
        // factor: 0.5, 1, 2 etc.
        this.baseCharWidth = 8 * factor;
        this.baseCharHeight = 16 * factor;
        this.resize();
    }

    clear() {
        this.ctx.fillStyle = COLORS.black;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawChar(x, y, char, color = 'w', bgColor = 'black') {
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

    // Helper to draw a string
    drawText(x, y, text, color = 'w', bgColor = 'black') {
        for (let i = 0; i < text.length; i++) {
            this.drawChar(x + i, y, text[i], color, bgColor);
        }
    }

    /**
     * Draws a semi-transparent color block over a tile (for VFX)
     */
    drawOverlay(x, y, color, alpha = 0.5) {
        const px = x * this.charWidth;
        const py = y * this.charHeight;
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = COLORS[color] || color;
        this.ctx.fillRect(px, py, this.charWidth, this.charHeight);
        this.ctx.restore();
    }

    /**
     * Applies a global screen filter (e.g. for spooky atmosphere)
     */
    drawGlobalFilter(color, alpha = 0.2) {
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = COLORS[color] || color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }
}
