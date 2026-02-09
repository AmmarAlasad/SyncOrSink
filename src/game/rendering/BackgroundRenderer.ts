import { GameConfig } from '../core/GameConfig';
import type { Camera } from '../core/Camera';
import { assetLoader } from '../systems/AssetLoader';

/**
 * BackgroundRenderer - Renders background elements
 * Extracted from GameCanvas.tsx lines 383-384, 439-443
 */
export class BackgroundRenderer {
    render(ctx: CanvasRenderingContext2D, camera: Camera, collectionName?: string | null): void {
        const { width, height } = camera.viewport;

        // Base background color (outside world)
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);

        // Tile assets within world boundaries
        const wallDark = assetLoader.getImage('break-wall-dark');
        const wallNormal = assetLoader.getImage('break-wall');

        if (wallDark && wallNormal) {
            const startCol = Math.max(0, Math.floor(camera.x / GameConfig.GRID_SIZE));
            const endCol = Math.min(GameConfig.MAP_BLOCKS, Math.ceil((camera.x + width) / GameConfig.GRID_SIZE));
            const startRow = Math.max(0, Math.floor(camera.y / GameConfig.GRID_SIZE));
            const endRow = Math.min(GameConfig.MAP_BLOCKS, Math.ceil((camera.y + height) / GameConfig.GRID_SIZE));

            for (let col = startCol; col < endCol; col++) {
                for (let row = startRow; row < endRow; row++) {
                    const isWall = col === 0 || col === GameConfig.MAP_BLOCKS - 1 || row === 0 || row === GameConfig.MAP_BLOCKS - 1;
                    const img = isWall ? wallNormal : wallDark;

                    ctx.drawImage(
                        img,
                        col * GameConfig.GRID_SIZE - camera.x,
                        row * GameConfig.GRID_SIZE - camera.y,
                        GameConfig.GRID_SIZE,
                        GameConfig.GRID_SIZE
                    );
                }
            }
        } else {
            // Fallback if image not loaded
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(
                -camera.x,
                -camera.y,
                GameConfig.WORLD_SIZE,
                GameConfig.WORLD_SIZE
            );
        }

        // Watermark text
        if (collectionName) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.font = '900 150px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                collectionName,
                GameConfig.WORLD_SIZE / 2 - camera.x,
                GameConfig.WORLD_SIZE / 2 - camera.y
            );
        }
    }
}
