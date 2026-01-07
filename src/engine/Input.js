/**
 * Input Engine
 * Handles Keyboard and Mouse interactions.
 */
export default class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {};
        this.prevKeys = {}; // For "Just Pressed" checks

        this.mouse = {
            x: 0,
            y: 0,
            left: false,
            right: false,
            leftDown: false // For "Just Clicked"
        };

        // Bindings
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));

        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Block context menu

        // Touch Support (Mobile)
        canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    }

    update() {
        // Copy current keys to prevKeys for next frame's "Just Pressed"
        this.prevKeys = { ...this.keys };
        this.mouse.leftDown = false; // Reset "Just Clicked"
    }

    // Touch Handlers
    onTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.updateMouseFromTouch(touch);
        this.mouse.left = true;
        this.mouse.leftDown = true;

        // Hack: Virtual D-Pad for mobile?
        // For now, Left side of screen = Left/Right (Movement), Right side = Jump/Dig
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const width = rect.width;

        // Simple Split Controls
        if (x < width * 0.2) this.keys['KeyA'] = true;
        else if (x < width * 0.4) this.keys['KeyD'] = true;
        else this.keys['Space'] = true; // Jump/Action
    }

    onTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.updateMouseFromTouch(touch);
    }

    onTouchEnd(e) {
        e.preventDefault();
        this.mouse.left = false;
        // Reset keys
        this.keys['KeyA'] = false;
        this.keys['KeyD'] = false;
        this.keys['Space'] = false;
    }

    updateMouseFromTouch(touch) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = touch.clientX - rect.left;
        this.mouse.y = touch.clientY - rect.top;
    }

    onKeyDown(e) {
        this.keys[e.code] = true;
    }

    onKeyUp(e) {
        this.keys[e.code] = false;
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Calculate mouse pos relative to canvas, scaling if necessary
        // Note: The logic here assumes the canvas fills the window or simple scaling
        // If we use specific resolution, we might need to map client coordinates to logical coordinates
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    }

    onMouseDown(e) {
        if (e.button === 0) {
            this.mouse.left = true;
            this.mouse.leftDown = true;
        } else if (e.button === 2) {
            this.mouse.right = true;
        }
    }

    onMouseUp(e) {
        if (e.button === 0) this.mouse.left = false;
        else if (e.button === 2) this.mouse.right = false;
    }

    isDown(code) {
        return !!this.keys[code];
    }

    isPressed(code) {
        return !!this.keys[code] && !this.prevKeys[code];
    }
}
