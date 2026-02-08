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

            const dy = Math.abs(player.position.y - enemy.position.y);
            const dx = Math.abs(player.position.x - enemy.position.x);

            // Restricted to Horizontal View (same row, within range)
            if (dy < GameConfig.DETECTION_ROW_THRESHOLD && dx < detectionRange) {
                if (dx < minDist) {
                    minDist = dx;
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
