import { GameConfig } from '../../core/GameConfig';
import type { Enemy, Door } from '@/store/store';

export interface InvestigationResult {
    x: number;
    y: number;
    timer: number;
    shouldReturn?: boolean;
    returnTarget?: { x: number, y: number };
}

/**
 * InvestigateBehavior - Handles guard investigation behavior
 * Extracted from GameCanvas.tsx lines 290-307
 */
export class InvestigateBehavior {
    /**
     * Update enemy during investigation
     * @param enemy The investigating enemy
     * @param deltaTime Time since last update
     * @param doors Available doors for return
     * @returns Updated state
     */
    static update(
        enemy: Enemy,
        deltaTime: number,
        doors: Door[]
    ): InvestigationResult {
        if (!enemy.targetPosition) {
            throw new Error('Investigation requires target position');
        }

        const distToTarget = Math.hypot(
            enemy.targetPosition.x - enemy.position.x,
            enemy.targetPosition.y - enemy.position.y
        );

        const currentTimer = enemy.investigationTimer || 0;

        // Still moving to investigation site
        if (distToTarget > 10) {
            const speed = GameConfig.PLAYER_BASE_SPEED * 1.5; // Guard investigating at 1.5x player speed
            const angle = Math.atan2(
                enemy.targetPosition.y - enemy.position.y,
                enemy.targetPosition.x - enemy.position.x
            );

            return {
                x: enemy.position.x + Math.cos(angle) * speed * deltaTime,
                y: enemy.position.y + Math.sin(angle) * speed * deltaTime,
                timer: currentTimer
            };
        }

        // At investigation site, wait
        const newTimer = currentTimer + deltaTime;

        if (newTimer >= GameConfig.INVESTIGATION_DURATION) {
            // Investigation complete, return to door
            const door = doors.find(d => d.id === enemy.spawnDoorId);

            return {
                x: enemy.position.x,
                y: enemy.position.y,
                timer: newTimer,
                shouldReturn: true,
                returnTarget: door ? { ...door.position } : undefined
            };
        }

        // Still investigating
        return {
            x: enemy.position.x,
            y: enemy.position.y,
            timer: newTimer
        };
    }
}
