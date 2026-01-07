/**
 * Physics Engine
 * Contains Vector math, AABB collision, and basic RigidBody dynamics.
 */

export class V2 {
    constructor(x, y) { this.x = x; this.y = y; }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    mult(s) { this.x *= s; this.y *= s; return this; }
    clone() { return new V2(this.x, this.y); }
}

export class AABB {
    constructor(x, y, w, h) {
        this.pos = new V2(x, y);
        this.size = new V2(w, h);
    }

    get left() { return this.pos.x; }
    get right() { return this.pos.x + this.size.x; }
    get top() { return this.pos.y; }
    get bottom() { return this.pos.y + this.size.y; }
    get center() { return new V2(this.pos.x + this.size.x / 2, this.pos.y + this.size.y / 2); }

    overlaps(other) {
        return (
            this.left < other.right &&
            this.right > other.left &&
            this.top < other.bottom &&
            this.bottom > other.top
        );
    }

    // Check overlap with a point
    contains(x, y) {
        return (
            x >= this.left &&
            x <= this.right &&
            y >= this.top &&
            y <= this.bottom
        );
    }
}

export class PhysicsBody {
    constructor(x, y, w, h) {
        this.pos = new V2(x, y);
        this.size = new V2(w, h); // Hitbox size
        this.vel = new V2(0, 0);
        this.acc = new V2(0, 0);

        this.aabb = new AABB(x, y, w, h);

        // Physics Params
        this.mass = 1.0;
        this.drag = new V2(0.9, 0.99); // Horizontal / Vertical drag (air resistance)
        this.groundDrag = 0.8; // Friction when on ground

        this.gravity = 0; // Set by World usually, or per entity

        this.onGround = false;

        // 16x16 Tile constraint helper
        // We might want visually larger sprites, but hitboxes often align with grid
    }

    applyForce(fx, fy) {
        this.acc.x += fx / this.mass;
        this.acc.y += fy / this.mass;
    }

    update(dt) {
        // Apply Gravity
        this.vel.y += this.gravity * dt;

        // Apply Drag
        this.vel.x *= this.onGround ? this.groundDrag : this.drag.x;
        this.vel.y *= this.drag.y;

        // Apply Acceleration
        this.vel.x += this.acc.x * dt;
        this.vel.y += this.acc.y * dt;

        // Simple Terminal Velocity Cap (optional but good for stability)
        const terminalVel = 1000;
        this.vel.x = Math.max(-terminalVel, Math.min(terminalVel, this.vel.x));
        this.vel.y = Math.max(-terminalVel, Math.min(terminalVel, this.vel.y));

        // Integrate Position
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;

        // Update AABB
        this.aabb.pos.x = this.pos.x;
        this.aabb.pos.y = this.pos.y;

        // Reset Acc (forces are instantaneous)
        this.acc.x = 0;
        this.acc.y = 0;
    }
}
