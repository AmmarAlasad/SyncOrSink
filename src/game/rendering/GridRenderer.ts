import { GameConfig } from '../core/GameConfig';
import type { Camera } from '../core/Camera';
import { assetLoader } from '../systems/AssetLoader';

/**
 * GridRenderer - Renders the game grid
 * Extracted from GameCanvas.tsx lines 386-396
 */
export class GridRenderer {
    render(ctx: CanvasRenderingContext2D, camera: Camera): void {
        const { width, height } = camera.viewport;

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;

        const startX = -(camera.x % GameConfig.GRID_SIZE);
        const startY = -(camera.y % GameConfig.GRID_SIZE);

        // Vertical lines
        for (let x = startX; x < width; x += GameConfig.GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = startY; y < height; y += GameConfig.GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // World boundary - simple stroke instead of duplicate walls
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(
            -camera.x,
            -camera.y,
            GameConfig.WORLD_SIZE,
            GameConfig.WORLD_SIZE
        );
    }
}
