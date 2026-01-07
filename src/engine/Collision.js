/**
 * Collision Resolver
 * Handles Entity vs World interactions.
 */
import { CELL_SIZE } from '../world/World.js';

export function resolveMapCollision(body, world) {
    body.onGround = false;

    // 1. Horizontal Collision (X-Axis)
    // Predict next X position
    let nextX = body.pos.x + body.vel.x * 0.016; // Small lookahead or just use current if updated before
    // (Actually simpler: we run this AFTER moving x/y in integration step, but ideally we do component-based)
    // Let's assume standard AABB sweep or Separation Axis Theorem style "Move and Slide"

    // SIMPLIFIED APPROACH: Separation
    // Check corners
    const checkTiles = (aabb) => {
        let minX = Math.floor(aabb.left / CELL_SIZE);
        let maxX = Math.floor(aabb.right / CELL_SIZE);
        let minY = Math.floor(aabb.top / CELL_SIZE);
        let maxY = Math.floor(aabb.bottom / CELL_SIZE);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                let tile = world.getTile(x, y);
                if (tile !== 0) return { x, y, tile }; // Hit
            }
        }
        return null; // Open
    };

    // Separate Axis Logic
    // Apply X first? OR we can resolve overlaps.
    // Since we integrated both in PhysicsBody.update, we are potentially inside a block now.
    // We need to push back out.

    // Center point
    const cx = body.pos.x + body.size.x / 2;
    const cy = body.pos.y + body.size.y / 2;

    // Check Top/Bottom collisions (Y-Axis)
    if (body.vel.y > 0) { // Falling
        // Check bottom edge
        let tileY = Math.floor((body.pos.y + body.size.y) / CELL_SIZE);
        let startX = Math.floor(body.pos.x / CELL_SIZE);
        let endX = Math.floor((body.pos.x + body.size.x - 0.01) / CELL_SIZE);

        for (let x = startX; x <= endX; x++) {
            if (world.getTile(x, tileY) !== 0) {
                // Landed
                body.pos.y = tileY * CELL_SIZE - body.size.y;
                body.vel.y = 0;
                body.onGround = true;
                break;
            }
        }
    } else if (body.vel.y < 0) { // Jumping/Moving Up
        // Check top edge
        let tileY = Math.floor(body.pos.y / CELL_SIZE);
        let startX = Math.floor(body.pos.x / CELL_SIZE);
        let endX = Math.floor((body.pos.x + body.size.x - 0.01) / CELL_SIZE);

        for (let x = startX; x <= endX; x++) {
            if (world.getTile(x, tileY) !== 0) {
                // Bonk head
                body.pos.y = (tileY + 1) * CELL_SIZE;
                body.vel.y = 0;
                break;
            }
        }
    }

    // Check Left/Right collisions (X-Axis)
    if (body.vel.x > 0) { // Moving Right
        let tileX = Math.floor((body.pos.x + body.size.x) / CELL_SIZE);
        let startY = Math.floor(body.pos.y / CELL_SIZE);
        let endY = Math.floor((body.pos.y + body.size.y - 0.01) / CELL_SIZE);

        for (let y = startY; y <= endY; y++) {
            if (world.getTile(tileX, y) !== 0) {
                // Hit wall
                body.pos.x = tileX * CELL_SIZE - body.size.x;
                body.vel.x = 0;
                break;
            }
        }
    } else if (body.vel.x < 0) { // Moving Left
        let tileX = Math.floor(body.pos.x / CELL_SIZE);
        let startY = Math.floor(body.pos.y / CELL_SIZE);
        let endY = Math.floor((body.pos.y + body.size.y - 0.01) / CELL_SIZE);

        for (let y = startY; y <= endY; y++) {
            if (world.getTile(tileX, y) !== 0) {
                // Hit wall
                body.pos.x = (tileX + 1) * CELL_SIZE;
                body.vel.x = 0;
                break;
            }
        }
    }
}
