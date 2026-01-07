/**
 * Base Entity System
 */
import { PhysicsBody } from '../engine/Physics.js';

export class Entity extends PhysicsBody {
    constructor(x, y, w, h, type) {
        super(x, y, w, h);
        this.type = type;
        this.health = 10;
        this.alive = true;
        this.state = 'WALKING'; // WALKING, SHELL, KICKED
        this.ai = null;
        this.color = '#FFF';
    }

    update(dt, world) {
        if (!this.alive) return;
        if (this.ai) this.ai(this, dt, world);
        super.update(dt);
    }
}

// AI Patterns (Mario-inspired)
export const AI = {
    WALKING_SPORE: (ent, dt, world) => {
        // Simple Goomba Patrol
        if (!ent.dir) ent.dir = 1;
        ent.applyForce(ent.dir * 400, 0);

        // Check for walls or edges
        const aheadX = ent.pos.x + (ent.dir > 0 ? ent.size.x + 2 : -2);
        const tile = world.getTileAtPos(aheadX, ent.pos.y + ent.size.y / 2);
        if (tile !== 0) {
            ent.dir *= -1; // Bounce off walls
            ent.vel.x = 0;
        }
    },
    SHELL_HIDE: (ent, dt, world) => {
        if (ent.state === 'WALKING') {
            if (!ent.dir) ent.dir = 1;
            ent.applyForce(ent.dir * 300, 0);

            const aheadX = ent.pos.x + (ent.dir > 0 ? ent.size.x + 2 : -2);
            const tile = world.getTileAtPos(aheadX, ent.pos.y + ent.size.y / 2);
            if (tile !== 0) {
                ent.dir *= -1;
                ent.vel.x = 0;
            }
        } else if (ent.state === 'KICKED') {
            // High speed shell
            ent.applyForce(ent.dir * 1200, 0);

            // Check for wall bounce
            const aheadX = ent.pos.x + (ent.dir > 0 ? ent.size.x + 2 : -2);
            if (world.getTileAtPos(aheadX, ent.pos.y + 1) !== 0) {
                ent.dir *= -1;
                ent.vel.x *= -0.5; // Slight friction on bounce
            }
        } else {
            // SHELL state (Stationary)
            ent.vel.x *= 0.9;
        }
    }
};
