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

        const speed = GameConfig.getEnemySpeed(enemy.type, 'chase');
        const angle = Math.atan2(
            target.position.y - enemy.position.y,
            target.position.x - enemy.position.x
        );

        return {
            x: enemy.position.x + Math.cos(angle) * speed * deltaTime,
            y: enemy.position.y + Math.sin(angle) * speed * deltaTime
        };
    }
}
