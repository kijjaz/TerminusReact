/**
 * Camera System
 * Tracks an entity and centers the view.
 */
export default class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.target = null;

        // Bounds (optional, can be infinite)
        this.bounds = null;
    }

    follow(entity) {
        this.target = entity;
    }

    setBounds(minX, minY, maxX, maxY) {
        this.bounds = { minX, minY, maxX, maxY };
    }

    update() {
        if (this.target) {
            // Center on target (assuming target has pos.x, pos.y and optionally size)
            // We aim for the center of the target if possible
            const targetX = this.target.pos ? this.target.pos.x : this.target.x;
            const targetY = this.target.pos ? this.target.pos.y : this.target.y;
            const targetW = this.target.size ? this.target.size.x : 16;
            const targetH = this.target.size ? this.target.size.y : 16;

            const cx = targetX + targetW / 2;
            const cy = targetY + targetH / 2;

            this.x = cx - this.width / 2;
            this.y = cy - this.height / 2;
        }

        // Clamp to bounds
        if (this.bounds) {
            this.x = Math.max(this.bounds.minX, Math.min(this.x, this.bounds.maxX - this.width));
            this.y = Math.max(this.bounds.minY, Math.min(this.y, this.bounds.maxY - this.height));
        }

        // Floor to prevent sub-pixel rendering jitter (optional, but good for pixel art)
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
    }
}
