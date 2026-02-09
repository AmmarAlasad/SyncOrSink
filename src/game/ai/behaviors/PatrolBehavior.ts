import { GameConfig } from '../../core/GameConfig';
import type { Enemy } from '@/store/store';

/**
 * PatrolBehavior - Handles enemy patrol movement
 * Extracted from GameCanvas.tsx lines 324-334
 */
export class PatrolBehavior {
    /**
     * Update enemy position during patrol
     * @param enemy The enemy to update
     * @param deltaTime Time since last update
     * @returns Updated position
     */
    static update(enemy: Enemy, deltaTime: number): { x: number, y: number, patrolIndex?: number } {
        const target = enemy.patrolPoints[enemy.patrolIndex];
        const dist = Math.hypot(target.x - enemy.position.x, target.y - enemy.position.y);

        // Reached waypoint, move to next
        if (dist < GameConfig.PATROL_WAYPOINT_THRESHOLD) {
            const nextIndex = (enemy.patrolIndex + 1) % enemy.patrolPoints.length;
            if (enemy.type === 'dog') console.log(`Dog reached waypoint. Next index: ${nextIndex}`);
            return {
                x: enemy.position.x,
                y: enemy.position.y,
                patrolIndex: nextIndex
            };
        }

        // Move towards waypoint
        const speed = GameConfig.getEnemySpeed(enemy.type, 'patrol');
        const angle = Math.atan2(target.y - enemy.position.y, target.x - enemy.position.x);

        return {
            x: enemy.position.x + Math.cos(angle) * speed * deltaTime,
            y: enemy.position.y + Math.sin(angle) * speed * deltaTime
        };
    }
}
