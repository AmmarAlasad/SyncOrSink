import { GameConfig } from './GameConfig';
import type { Enemy, Door, Player } from '@/store/store';

export interface SpawnConfig {
    spawnGuard: boolean;
    spawnDog: boolean;
    spawnDrone: boolean;
    spawnCamera: boolean;
}

/**
 * GameInitializer - Handles game initialization logic
 * Extracted from store.ts lines 202-298
 */
export class GameInitializer {
    /**
     * Initialize all doors at fixed positions
     */
    static initializeDoors(): Door[] {
        return GameConfig.DOOR_POSITIONS.map((pos, index) => ({
            id: `door-${index + 1}`,
            position: GameConfig.gridToWorld(pos.x, pos.y)
        }));
    }

    /**
     * Initialize enemies based on spawn configuration
     */
    static initializeEnemies(config: SpawnConfig): Enemy[] {
        const enemies: Enemy[] = [];

        if (config.spawnGuard) {
            enemies.push(this.createGuard());
        }

        if (config.spawnDog) {
            enemies.push(this.createDog());
        }

        if (config.spawnDrone) {
            enemies.push(this.createDrone());
        }

        if (config.spawnCamera) {
            enemies.push(...this.createCameras());
        }

        return enemies;
    }

    /**
     * Randomize player positions
     */
    static randomizePlayerPositions(players: Player[]): Player[] {
        return players.map(p => ({
            ...p,
            isFrozen: false,
            position: GameConfig.getRandomPosition()
        }));
    }

    // Private helper methods for creating specific enemy types

    private static createGuard(): Enemy {
        const row = Math.floor(Math.random() * (GameConfig.MAP_BLOCKS - 4)) + 2;
        const startCol = Math.floor(Math.random() * 6) + 1;
        const endCol = Math.floor(Math.random() * 6) + 8;

        const start = GameConfig.gridToWorld(startCol, row);
        const end = GameConfig.gridToWorld(endCol, row);

        return {
            id: 'guard-1',
            type: 'guard',
            position: { ...start },
            state: 'patrolling',
            patrolIndex: 0,
            patrolPoints: [start, end]
        };
    }

    private static createDog(): Enemy {
        const row = Math.floor(Math.random() * (GameConfig.MAP_BLOCKS - 4)) + 2;
        const startCol = Math.floor(Math.random() * 5) + 1;
        const endCol = Math.floor(Math.random() * 5) + 9;

        const start = GameConfig.gridToWorld(startCol, row);
        const end = GameConfig.gridToWorld(endCol, row);

        return {
            id: 'dog-1',
            type: 'dog',
            position: { ...start },
            state: 'patrolling',
            patrolIndex: 0,
            patrolPoints: [start, end]
        };
    }

    private static createDrone(): Enemy {
        const row = Math.floor(Math.random() * (GameConfig.MAP_BLOCKS - 4)) + 2;
        const startCol = Math.floor(Math.random() * 4) + 2;
        const endCol = Math.floor(Math.random() * 4) + 10;

        const start = GameConfig.gridToWorld(startCol, row);
        const end = GameConfig.gridToWorld(endCol, row);

        return {
            id: 'drone-1',
            type: 'drone',
            position: { ...start },
            state: 'patrolling',
            patrolIndex: 0,
            patrolPoints: [start, end]
        };
    }

    private static createCameras(): Enemy[] {
        return GameConfig.CAMERA_POSITIONS.map((pos, i) => ({
            id: `camera-${i + 1}`,
            type: 'camera' as const,
            position: GameConfig.gridToWorld(pos.x, pos.y),
            state: 'patrolling' as const,
            patrolIndex: 0,
            patrolPoints: [GameConfig.gridToWorld(pos.x, pos.y)]
        }));
    }
}
