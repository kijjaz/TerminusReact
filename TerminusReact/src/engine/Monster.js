export class Monster {
    constructor(x, y, template) {
        this.x = x;
        this.y = y;
        this.char = template.char || 'g';
        this.color = template.color || 'g';
        this.name = template.name || 'Goblin';

        // Stats
        this.hp = template.hp || 30;
        this.maxHp = this.hp;
        this.attack = template.attack || 5;
        this.defense = template.defense || 0;

        // AI State
        this.state = 'idle'; // idle, chase, attack, flee
        this.target = null;
        this.sightRange = 8;
        this.moveTimer = 0;
        this.moveInterval = template.speed || 10; // Frames between moves? Or Time?
        // Using simple frame counter for now or time delta accumulator
        this.timeSinceLastMove = 0;
        this.moveDelay = 1.0; // Seconds per move (slow)
    }

    update(dt, player, world) {
        // Simple distance check
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // FSM
        switch (this.state) {
            case 'idle':
                if (dist < this.sightRange) {
                    this.state = 'chase';
                    this.target = player;
                    // Play alert sound?
                }
                break;
            case 'chase':
                if (dist > this.sightRange * 1.5) {
                    this.state = 'idle';
                    this.target = null;
                } else if (dist < 1.5) {
                    this.state = 'attack';
                } else {
                    this.moveTowards(player.x, player.y, dt, world);
                }
                break;
            case 'attack':
                if (dist >= 1.5) {
                    this.state = 'chase';
                } else {
                    // Attack Logic managed by GameEngine or here?
                    // For now, just stay close. GameEngine handles turn-based or cooldown attacks.
                }
                break;
        }
    }

    moveTowards(tx, ty, dt, world) {
        this.timeSinceLastMove += dt;
        if (this.timeSinceLastMove < this.moveDelay) return;
        this.timeSinceLastMove = 0;

        // Simple Step
        const dx = Math.sign(tx - this.x);
        const dy = Math.sign(ty - this.y);

        // Try diagonal
        if (this.canMove(this.x + dx, this.y + dy, world)) {
            this.x += dx;
            this.y += dy;
        } else if (this.canMove(this.x + dx, this.y, world)) {
            this.x += dx;
        } else if (this.canMove(this.x, this.y + dy, world)) {
            this.y += dy;
        }
    }

    canMove(x, y, world) {
        const tile = world.getTile(Math.floor(x), Math.floor(y));
        // Simple walkability check (reuse Player's walkable list if possible, or simplified)
        return tile && tile.char !== '#' && tile.char !== '^';
    }

    takeDamage(amount) {
        this.hp -= Math.max(1, amount - this.defense);
        // Indication?
    }
}
