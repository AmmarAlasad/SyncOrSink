import { GameConfig } from './GameConfig';

export interface Vector2 {
    x: number;
    y: number;
}

export class Camera {
    private _position: Vector2;
    private _viewport: { width: number, height: number };

    constructor(viewport: { width: number, height: number }) {
        this._position = { x: 0, y: 0 };
        this._viewport = viewport;
    }

    get position(): Vector2 {
        return { ...this._position };
    }

    get viewport() {
        return { ...this._viewport };
    }

    /**
     * Update camera to follow a target position
     */
    follow(target: Vector2): void {
        this._position.x = target.x - this._viewport.width / 2;
        this._position.y = target.y - this._viewport.height / 2;
    }

    /**
     * Update viewport dimensions (e.g., on window resize)
     */
    updateViewport(width: number, height: number): void {
        this._viewport.width = width;
        this._viewport.height = height;
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldPos: Vector2): Vector2 {
        return {
            x: worldPos.x - this._position.x,
            y: worldPos.y - this._position.y
        };
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenPos: Vector2): Vector2 {
        return {
            x: screenPos.x + this._position.x,
            y: screenPos.y + this._position.y
        };
    }

    /**
     * Check if a world position is visible in the viewport
     */
    isVisible(worldPos: Vector2, margin: number = 50): boolean {
        const screen = this.worldToScreen(worldPos);
        return screen.x >= -margin &&
            screen.x <= this._viewport.width + margin &&
            screen.y >= -margin &&
            screen.y <= this._viewport.height + margin;
    }

    /**
     * Get camera X position (for rendering)
     */
    get x(): number {
        return this._position.x;
    }

    /**
     * Get camera Y position (for rendering)
     */
    get y(): number {
        return this._position.y;
    }
}
