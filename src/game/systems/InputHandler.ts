export class InputHandler {
    keysPressed: Record<string, boolean> = {};
    mousePos: { x: number, y: number } = { x: 0, y: 0 };

    constructor() {
        // defined but not attached automatically
    }

    attach() {
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', this.handleKeyDown);
            window.addEventListener('keyup', this.handleKeyUp);
            window.addEventListener('mousemove', this.handleMouseMove);
        }
    }

    detach() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', this.handleKeyDown);
            window.removeEventListener('keyup', this.handleKeyUp);
            window.removeEventListener('mousemove', this.handleMouseMove);
        }
    }

    private handleKeyDown = (e: KeyboardEvent) => {
        this.keysPressed[e.code] = true;
    };

    private handleKeyUp = (e: KeyboardEvent) => {
        this.keysPressed[e.code] = false;
    };

    private handleMouseMove = (e: MouseEvent) => {
        this.mousePos = { x: e.clientX, y: e.clientY };
    };

    isKeyPressed(key: string): boolean {
        return !!this.keysPressed[key];
    }

    getMousePos() {
        return this.mousePos;
    }

    dispose() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', this.handleKeyDown);
            window.removeEventListener('keyup', this.handleKeyUp);
            window.removeEventListener('mousemove', this.handleMouseMove);
        }
    }
}

export const inputHandler = new InputHandler();
