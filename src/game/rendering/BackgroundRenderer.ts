import { GameConfig } from '../core/GameConfig';
import type { Camera } from '../core/Camera';

/**
 * BackgroundRenderer - Renders background elements
 * Extracted from GameCanvas.tsx lines 383-384, 439-443
 */
export class BackgroundRenderer {
    render(ctx: CanvasRenderingContext2D, camera: Camera, collectionName?: string | null): void {
        const { width, height } = camera.viewport;

        // Background color
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

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
