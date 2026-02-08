/**
 * GameConfig - Centralized game configuration and constants
 * Extracted from GameCanvas.tsx and store.ts
 */

export class GameConfig {
    // World Configuration
    static readonly GRID_SIZE = 64;
    static readonly MAP_BLOCKS = 16;
    static readonly WORLD_SIZE = GameConfig.GRID_SIZE * GameConfig.MAP_BLOCKS;
    static readonly CENTER_POS = (GameConfig.MAP_BLOCKS / 2) * GameConfig.GRID_SIZE + (GameConfig.GRID_SIZE / 2);

    // Player Configuration
    static readonly PLAYER_SIZE = 64;
    static readonly PLAYER_SPEED_BLOCKS_PER_SEC = 3.5;
    static readonly PLAYER_BASE_SPEED = GameConfig.GRID_SIZE * GameConfig.PLAYER_SPEED_BLOCKS_PER_SEC;

    // Enemy Sizes
    static readonly ENEMY_SIZE_NORMAL = 64;
    static readonly ENEMY_SIZE_DOG = 48;

    // Enemy Speeds (blocks per second)
    static readonly ENEMY_SPEED = {
        GUARD_PATROL: 1.5,
        GUARD_CHASE: 2.5,
        GUARD_INVESTIGATING: 1.5, // Multiplied by player speed
        DOG_PATROL: 2.0,
        DOG_CHASE: 3.5,
        DRONE_PATROL: 2.5,
        DRONE_CHASE: 0,
        CAMERA_PATROL: 0,
        CAMERA_CHASE: 0,
    };

    // Detection Ranges (in grid units)
    static readonly DETECTION_RANGE = {
        GUARD: 2,
        DOG: 5,
        DRONE: 2,
        CAMERA: 2,
    };

    // Collision Configuration
    static readonly COLLISION_DISTANCE = 40;
    static readonly DETECTION_ROW_THRESHOLD = 32; // Horizontal view threshold

    // Investigation Configuration
    static readonly INVESTIGATION_DURATION = 8; // seconds
    static readonly PATROL_WAYPOINT_THRESHOLD = 5; // distance to waypoint

    // Network Configuration
    static readonly NETWORK_UPDATE_INTERVAL = 33; // ms (30 FPS)

    // Animation Configuration
    static readonly ANIMATION_FRAME_DURATION = 200; // ms

    // Player Colors
    static readonly PLAYER_COLORS = {
        HOST: '#6366f1', // Indigo
        AVAILABLE: ['#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316']
    };

    // World Boundaries
    static readonly WORLD_MARGIN = 32;
    static readonly MIN_SPAWN_MARGIN = 2; // blocks

    // Door Positions (fixed corners)
    static readonly DOOR_POSITIONS = [
        { x: 1, y: 1 },
        { x: 14, y: 1 },
        { x: 1, y: 14 },
        { x: 14, y: 14 },
    ];

    // Camera Positions (fixed)
    static readonly CAMERA_POSITIONS = [
        { x: 4, y: 4 },
        { x: 11, y: 8 },
        { x: 4, y: 11 },
    ];

    // Helper Methods
    static gridToWorld(gridX: number, gridY: number): { x: number, y: number } {
        return {
            x: gridX * GameConfig.GRID_SIZE + 32,
            y: gridY * GameConfig.GRID_SIZE + 32
        };
    }

    static worldToGrid(worldX: number, worldY: number): { x: number, y: number } {
        return {
            x: Math.floor(worldX / GameConfig.GRID_SIZE),
            y: Math.floor(worldY / GameConfig.GRID_SIZE)
        };
    }

    static getEnemySpeed(type: 'guard' | 'dog' | 'drone' | 'camera', state: 'patrol' | 'chase' | 'investigating'): number {
        const speedKey = `${type.toUpperCase()}_${state.toUpperCase()}` as keyof typeof GameConfig.ENEMY_SPEED;
        return (GameConfig.ENEMY_SPEED[speedKey] || 0) * GameConfig.GRID_SIZE;
    }

    static getDetectionRange(type: 'guard' | 'dog' | 'drone' | 'camera'): number {
        const rangeKey = type.toUpperCase() as keyof typeof GameConfig.DETECTION_RANGE;
        return GameConfig.DETECTION_RANGE[rangeKey] * GameConfig.GRID_SIZE;
    }

    static getEnemySize(type: 'guard' | 'dog' | 'drone' | 'camera'): number {
        return type === 'dog' ? GameConfig.ENEMY_SIZE_DOG : GameConfig.ENEMY_SIZE_NORMAL;
    }

    static clampToWorld(x: number, y: number): { x: number, y: number } {
        return {
            x: Math.max(GameConfig.WORLD_MARGIN, Math.min(GameConfig.WORLD_SIZE - GameConfig.WORLD_MARGIN, x)),
            y: Math.max(GameConfig.WORLD_MARGIN, Math.min(GameConfig.WORLD_SIZE - GameConfig.WORLD_MARGIN, y))
        };
    }

    static getRandomPosition(margin: number = GameConfig.MIN_SPAWN_MARGIN): { x: number, y: number } {
        const bx = Math.floor(Math.random() * (GameConfig.MAP_BLOCKS - margin * 2)) + margin;
        const by = Math.floor(Math.random() * (GameConfig.MAP_BLOCKS - margin * 2)) + margin;
        return GameConfig.gridToWorld(bx, by);
    }
}
