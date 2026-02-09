import { GameConfig } from '../core/GameConfig';
import type { Player, Enemy } from '@/store/store';

export interface DetectionResult {
    player: Player;
    distance: number;
}

/**
 * DetectionSystem - Handles player detection logic for enemies
 * Extracted from GameCanvas.tsx lines 216-233
 */
export class DetectionSystem {
    /**
     * Detect the closest player within range using horizontal line-of-sight
     * @param enemy The enemy performing detection
     * @param players List of all players
     * @param detectionRange Maximum detection range
     * @returns Closest detected player or null
     */
    static detectPlayer(
        enemy: Enemy,
        players: Player[],
        detectionRange: number
    ): DetectionResult | null {
        let closestPlayer: Player | null = null;
        let minDist = detectionRange;

        for (const player of players) {
            if (!player.position || player.isFrozen) continue;

            const dx = player.position.x - enemy.position.x;
            const dy = player.position.y - enemy.position.y;
            const distance = Math.hypot(dx, dy);

            let isDetected = false;

            if (enemy.type === 'camera') {
                // Directional Detection for Cameras (2 blocks in front)
                const gridX = Math.abs(dx);
                const gridY = Math.abs(dy);

                // Must be within 0.5 blocks vertically
                const yThreshold = GameConfig.GRID_SIZE * 0.5;

                if (gridY < yThreshold && gridX < detectionRange) {
                    if (enemy.direction === 'Left' && dx < 0) {
                        isDetected = true;
                    } else if (enemy.direction === 'Right' && dx > 0) {
                        isDetected = true;
                    }
                }
            } else {
                // Omnidirectional Detection for Guard, Dog, Drone
                if (distance < detectionRange) {
                    isDetected = true;
                }
            }

            if (isDetected) {
                if (distance < minDist) {
                    minDist = distance;
                    closestPlayer = player;
                }
            }
        }

        return closestPlayer ? { player: closestPlayer, distance: minDist } : null;
    }

    /**
     * Check if enemy can detect any player
     */
    static canDetectPlayers(
        enemy: Enemy,
        players: Player[]
    ): boolean {
        const range = GameConfig.getDetectionRange(enemy.type);
        return this.detectPlayer(enemy, players, range) !== null;
    }
}
