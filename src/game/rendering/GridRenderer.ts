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

        // World boundary walls
        const wallImg = assetLoader.getImage('break-wall');
        if (wallImg) {
            const size = GameConfig.GRID_SIZE;
            const worldSize = GameConfig.WORLD_SIZE;

            // Draw walls all around the boundary
            // Top and Bottom
            for (let col = -1; col <= GameConfig.MAP_BLOCKS; col++) {
                // Top wall
                ctx.drawImage(
                    wallImg,
                    col * size - camera.x,
                    -size - camera.y,
                    size,
                    size
                );
                // Bottom wall
                ctx.drawImage(
                    wallImg,
                    col * size - camera.x,
                    worldSize - camera.y,
                    size,
                    size
                );
            }

            // Left and Right
            for (let row = 0; row < GameConfig.MAP_BLOCKS; row++) {
                // Left wall
                ctx.drawImage(
                    wallImg,
                    -size - camera.x,
                    row * size - camera.y,
                    size,
                    size
                );
                // Right wall
                ctx.drawImage(
                    wallImg,
                    worldSize - camera.x,
                    row * size - camera.y,
                    size,
                    size
                );
            }
        } else {
            // Fallback boundary
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 5;
            ctx.strokeRect(
                -camera.x,
                -camera.y,
                GameConfig.WORLD_SIZE,
                GameConfig.WORLD_SIZE
            );
        }
    }
}
