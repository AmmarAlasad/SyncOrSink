import { GameConfig } from '../../core/GameConfig';
import type { Enemy, Player } from '@/store/store';

/**
 * ChaseBehavior - Handles enemy chase movement
 * Extracted from GameCanvas.tsx lines 283-289
 */
export class ChaseBehavior {
    /**
     * Update enemy position during chase
     * @param enemy The enemy chasing
     * @param target The player being chased
     * @param deltaTime Time since last update
     * @returns Updated position or null if target lost
     */
    static update(
        enemy: Enemy,
        target: Player | undefined,
        deltaTime: number
    ): { x: number, y: number } | null {
        if (!target?.position) {
            return null; // Target lost
        }

        const dx = target.position.x - enemy.position.x;
        const dy = target.position.y - enemy.position.y;
        const distance = Math.hypot(dx, dy);

        // Max Chase Distance
        const maxDist = enemy.type === 'drone' ? GameConfig.GRID_SIZE : GameConfig.GRID_SIZE * 8; // Increased to 8 to cover Dog's 5 block detection + buffer
        if (distance > maxDist) {
            return null;
        }

        const speed = GameConfig.getEnemySpeed(enemy.type, 'chase');
        const angle = Math.atan2(dy, dx);

        return {
            x: enemy.position.x + Math.cos(angle) * speed * deltaTime,
            y: enemy.position.y + Math.sin(angle) * speed * deltaTime
        };
    }
}
