import { GameConfig } from '../core/GameConfig';
import type { Player, Enemy } from '@/store/store';

export interface CollisionResult {
    collided: boolean;
    enemy: Enemy;
    player: Player;
    shouldFreeze: boolean;
    shouldGameOver: boolean;
}

/**
 * CollisionSystem - Handles collision detection between players and enemies
 * Extracted from GameCanvas.tsx lines 336-349
 */
export class CollisionSystem {
    /**
     * Check collisions between all players and a specific enemy
     * @param enemy The enemy to check
     * @param players All players
     * @returns Array of collision results
     */
    static checkEnemyCollisions(enemy: Enemy, players: Player[]): CollisionResult[] {
        const results: CollisionResult[] = [];
        const isDog = enemy.type === 'dog';
        const isGuard = enemy.type === 'guard';

        for (const player of players) {
            if (!player.position) continue;

            const distance = Math.hypot(
                player.position.x - enemy.position.x,
                player.position.y - enemy.position.y
            );

            if (distance < GameConfig.COLLISION_DISTANCE) {
                results.push({
                    collided: true,
                    enemy,
                    player,
                    shouldFreeze: isGuard && !player.isFrozen,
                    shouldGameOver: isDog
                });
            }
        }

        return results;
    }

    /**
     * Check all collisions in the game
     */
    static checkAllCollisions(enemies: Enemy[], players: Player[]): CollisionResult[] {
        const allCollisions: CollisionResult[] = [];

        for (const enemy of enemies) {
            const collisions = this.checkEnemyCollisions(enemy, players);
            allCollisions.push(...collisions);
        }

        return allCollisions;
    }
}
