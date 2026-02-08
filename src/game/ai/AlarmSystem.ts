import { GameConfig } from '../core/GameConfig';
import type { Enemy, Door, Player } from '@/store/store';

export interface AlarmResult {
    alarmPosition: { x: number, y: number };
    spawnedGuard?: Enemy;
    respondingGuard?: Enemy;
}

/**
 * AlarmSystem - Handles alarm triggering and guard spawning
 * Extracted from GameCanvas.tsx lines 236-274
 */
export class AlarmSystem {
    /**
     * Trigger an alarm when drone/camera detects a player
     * @param detectedPlayer The player that was detected
     * @param doors Available doors for guard spawning
     * @param existingEnemies Current enemies in the game
     * @returns Alarm result with position and guard info
     */
    static triggerAlarm(
        detectedPlayer: Player,
        doors: Door[],
        existingEnemies: Enemy[]
    ): AlarmResult {
        if (!detectedPlayer.position) {
            throw new Error('Detected player has no position');
        }

        // Calculate alarm target (snap to grid)
        const targetBlockX = Math.floor(detectedPlayer.position.x / GameConfig.GRID_SIZE) * GameConfig.GRID_SIZE + 32;
        const targetBlockY = Math.floor(detectedPlayer.position.y / GameConfig.GRID_SIZE) * GameConfig.GRID_SIZE + 32;
        const alarmPosition = { x: targetBlockX, y: targetBlockY };

        // Find nearest door
        const nearestDoor = this.findNearestDoor(alarmPosition, doors);

        // Check for existing guard to respond
        const respondingGuard = existingEnemies.find(e =>
            e.type === 'guard' &&
            (e.state === 'patrolling' || (e.state === 'investigating' && e.id.includes('guard')))
        );

        if (respondingGuard) {
            // Update existing guard to investigate
            respondingGuard.state = 'investigating';
            respondingGuard.targetPosition = { ...alarmPosition };
            respondingGuard.investigationTimer = 0;
            respondingGuard.spawnDoorId = nearestDoor.id;

            return { alarmPosition, respondingGuard };
        } else {
            // Spawn new guard
            const spawnedGuard: Enemy = {
                id: `spawned-guard-${Date.now()}`,
                type: 'guard',
                position: { ...nearestDoor.position },
                state: 'investigating',
                targetPosition: { ...alarmPosition },
                patrolIndex: 0,
                patrolPoints: [{ ...nearestDoor.position }],
                spawnDoorId: nearestDoor.id,
                investigationTimer: 0
            };

            return { alarmPosition, spawnedGuard };
        }
    }

    /**
     * Find the nearest door to a target position
     */
    private static findNearestDoor(target: { x: number, y: number }, doors: Door[]): Door {
        return doors.reduce((prev, curr) => {
            const dPrev = Math.hypot(prev.position.x - target.x, prev.position.y - target.y);
            const dCurr = Math.hypot(curr.position.x - target.x, curr.position.y - target.y);
            return dCurr < dPrev ? curr : prev;
        });
    }
}
