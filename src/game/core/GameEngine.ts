import { Camera } from './Camera';
import { GameConfig } from './GameConfig';
import { GameInitializer } from './GameInitializer';
import { inputHandler } from '../systems/InputHandler';
import { assetLoader } from '../systems/AssetLoader';
import { PlayerMovement } from '../systems/PlayerMovement';
import { CollisionSystem } from '../systems/CollisionSystem';
import { DetectionSystem } from '../ai/DetectionSystem';
import { AlarmSystem } from '../ai/AlarmSystem';
import { PatrolBehavior } from '../ai/behaviors/PatrolBehavior';
import { ChaseBehavior } from '../ai/behaviors/ChaseBehavior';
import { InvestigateBehavior } from '../ai/behaviors/InvestigateBehavior';
import { GridRenderer } from '../rendering/GridRenderer';
import { BackgroundRenderer } from '../rendering/BackgroundRenderer';
import { EnemyAI } from '../ai/EnemyAI';
import { Player } from '../classes/Player';
import { Enemy } from '../classes/Enemy';
import { Door } from '../classes/Door';
import type { Enemy as EnemyType, Player as PlayerType, Door as DoorType } from '@/store/store';

export interface GameEngineConfig {
    canvas: HTMLCanvasElement;
    store: any; // Zustand store
    network: any; // PeerContext
}

/**
 * GameEngine - Main game loop coordinator
 * Replaces the massive render loop in GameCanvas.tsx
 */
export class GameEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private camera: Camera;
    private store: any;
    private network: any;

    // Renderers
    private backgroundRenderer: BackgroundRenderer;
    private gridRenderer: GridRenderer;

    // Instance maps
    private enemyInstances = new Map<string, Enemy>();

    // State
    private playerPos: { x: number, y: number };
    private remoteDisplayPos: Record<string, { x: number, y: number }> = {};
    private lastUpdate = 0;
    private lastEnemySync = 0;
    private lastFrameTime = 0;
    private animationFrameId?: number;
    private assetsLoaded = false;

    constructor(config: GameEngineConfig) {
        this.canvas = config.canvas;
        this.store = config.store;
        this.network = config.network;

        const ctx = this.canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Could not get canvas context');
        this.ctx = ctx;

        this.camera = new Camera({ width: window.innerWidth, height: window.innerHeight });
        this.backgroundRenderer = new BackgroundRenderer();
        this.gridRenderer = new GridRenderer();

        this.playerPos = { x: GameConfig.CENTER_POS, y: GameConfig.CENTER_POS };

        // Load assets
        assetLoader.loadAssets().then(() => {
            this.assetsLoaded = true;
        });

        // Attach input
        inputHandler.attach();
    }

    /**
     * Start the game loop
     */
    start(): void {
        const render = (timestamp: number) => {
            if (!this.lastFrameTime) this.lastFrameTime = timestamp;
            const deltaTime = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
            this.lastFrameTime = timestamp;

            this.update(deltaTime, timestamp);
            this.render(timestamp);

            this.animationFrameId = requestAnimationFrame(render);
        };

        this.animationFrameId = requestAnimationFrame(render);
    }

    /**
     * Update game state
     */
    private update(deltaTime: number, timestamp: number): void {
        const state = this.store.getState();
        const { lobby, localPlayer, settings } = state;

        // Resize canvas if needed
        if (this.canvas.width !== window.innerWidth || this.canvas.height !== window.innerHeight) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.camera.updateViewport(window.innerWidth, window.innerHeight);
        }

        // Sync local player position from store on start/restart
        const myState = lobby.players.find((p: PlayerType) => p.id === localPlayer.id);
        const isFrozen = myState?.isFrozen || false;
        const isGameOver = lobby.status === 'gameover';

        // Pick up randomized position when game starts
        if (lobby.status === 'playing' && myState?.position) {
            const dist = Math.hypot(this.playerPos.x - myState.position.x, this.playerPos.y - myState.position.y);
            // If the store position is very different from our local one (e.g. just started or restart)
            // or if we haven't moved yet (CENTER_POS), sync it.
            if (dist > 100 || (this.playerPos.x === GameConfig.CENTER_POS && this.playerPos.y === GameConfig.CENTER_POS)) {
                this.playerPos = { ...myState.position };
            }
        }

        if (lobby.status === 'playing') {
            const movementResult = PlayerMovement.update(
                this.playerPos,
                inputHandler,
                settings.keybinds,
                deltaTime,
                isFrozen,
                isGameOver
            );

            this.playerPos = { x: movementResult.x, y: movementResult.y };

            // Broadcast movement
            if (movementResult.moved && timestamp - this.lastUpdate > GameConfig.NETWORK_UPDATE_INTERVAL) {
                this.store.getState().updatePlayerPosition(localPlayer.id, this.playerPos.x, this.playerPos.y);
                this.network.broadcast({
                    type: 'PLAYER_MOVE',
                    playerId: localPlayer.id,
                    x: this.playerPos.x,
                    y: this.playerPos.y
                });
                this.lastUpdate = timestamp;
            }
        }

        // Update enemy AI (host only)
        const hostPlayer = lobby.players.find((p: PlayerType) => p.isHost);
        const isHost = hostPlayer ? localPlayer.id === hostPlayer.id : false;

        if (isHost && lobby.status === 'playing') {
            this.updateEnemyAI(deltaTime, timestamp, lobby, state);
        }

        // Sync enemy instances AFTER AI update so renderers see latest host-calculated pos
        this.syncEnemyInstances(this.store.getState().lobby.enemies);

        // Update camera
        this.camera.follow(this.playerPos);
    }

    /**
     * Render game
     */
    private render(timestamp: number): void {
        const state = this.store.getState();
        const { lobby, localPlayer } = state;

        // Background
        this.backgroundRenderer.render(this.ctx, this.camera, lobby.selectedCollection);

        // Grid
        this.gridRenderer.render(this.ctx, this.camera);

        // Doors
        lobby.doors.forEach((doorData: DoorType) => {
            const door = new Door(doorData);
            door.draw(this.ctx, this.camera.x, this.camera.y);
        });

        // Enemies
        if (this.assetsLoaded) {
            this.enemyInstances.forEach(enemy => {
                enemy.draw(this.ctx, this.camera.x, this.camera.y, timestamp);
            });
        }

        // Players
        this.renderPlayers(lobby.players, localPlayer.id, timestamp);
    }

    /**
     * Render all players
     */
    private renderPlayers(players: PlayerType[], localPlayerId: string, timestamp: number): void {
        players.forEach(p => {
            const isMe = p.id === localPlayerId;
            let worldX, worldY;

            if (isMe) {
                worldX = this.playerPos.x;
                worldY = this.playerPos.y;
            } else {
                const targetX = p.position?.x ?? GameConfig.CENTER_POS;
                const targetY = p.position?.y ?? GameConfig.CENTER_POS;

                if (!this.remoteDisplayPos[p.id]) {
                    this.remoteDisplayPos[p.id] = { x: targetX, y: targetY };
                }

                const lerpAmount = 1 - Math.exp(-15 * 0.016); // Approximate deltaTime
                this.remoteDisplayPos[p.id].x += (targetX - this.remoteDisplayPos[p.id].x) * lerpAmount;
                this.remoteDisplayPos[p.id].y += (targetY - this.remoteDisplayPos[p.id].y) * lerpAmount;

                worldX = this.remoteDisplayPos[p.id].x;
                worldY = this.remoteDisplayPos[p.id].y;
            }

            const player = new Player({ ...p, position: { x: worldX, y: worldY } });
            player.draw(this.ctx, this.camera.x, this.camera.y, inputHandler.getMousePos(), isMe);
        });
    }

    /**
     * Sync enemy instances with store state
     */
    private syncEnemyInstances(enemies: EnemyType[]): void {
        const currentIds = new Set(enemies.map(e => e.id));

        // Remove missing
        for (const id of this.enemyInstances.keys()) {
            if (!currentIds.has(id)) this.enemyInstances.delete(id);
        }

        // Add/Update
        enemies.forEach(data => {
            if (!this.enemyInstances.has(data.id)) {
                this.enemyInstances.set(data.id, new Enemy(data));
            } else {
                this.enemyInstances.get(data.id)!.updateData(data);
            }
        });
    }

    /**
     * Update enemy AI (host only) - This is still complex, extracted from GameCanvas
     */
    private updateEnemyAI(deltaTime: number, timestamp: number, lobby: any, state: any): void {
        const enemiesToRemove: string[] = [];
        const newEnemies: EnemyType[] = [];

        // Throttle enemy updates to 30fps to save bandwidth
        const shouldBroadcast = timestamp - this.lastEnemySync > GameConfig.NETWORK_UPDATE_INTERVAL;
        if (shouldBroadcast) {
            this.lastEnemySync = timestamp;
        }

        lobby.enemies.forEach((enemyData: EnemyType) => {
            if ((enemyData.state as any) === 'gone') return;

            const initialState = enemyData.state;

            // Use the centralized AI system
            const result = EnemyAI.update(enemyData, {
                deltaTime,
                players: lobby.players,
                doors: lobby.doors,
                allEnemies: lobby.enemies,
                broadcast: (msg) => {
                    // Always broadcast critical events (alarms, state changes)
                    // Throttle movement updates unless state changed
                    if (msg.type !== 'ENEMY_MOVE' || shouldBroadcast || msg.state !== initialState) {
                        this.network.broadcast(msg);
                    }
                },
                updateEnemy: (id, updates) => {
                    // Update local state immediately for smoother frame-to-frame logic
                    const enemy = lobby.enemies.find((e: EnemyType) => e.id === id);
                    if (enemy) {
                        Object.assign(enemy, updates);
                    }

                    // Sync to store
                    state.updateEnemyPosition(id,
                        updates.position?.x ?? (enemy?.position.x || 0),
                        updates.position?.y ?? (enemy?.position.y || 0),
                        updates.state ?? (enemy?.state || 'patrolling'),
                        updates.targetPlayerId,
                        updates.targetPosition,
                        updates.investigationTimer
                    );
                }
            });

            if ((result as any).remove) {
                enemiesToRemove.push(enemyData.id);
            }

            // Collision detection
            const collisions = CollisionSystem.checkEnemyCollisions(enemyData, lobby.players);
            collisions.forEach(collision => {
                if (collision.shouldGameOver) {
                    state.setGameStatus('gameover');
                    this.network.broadcast({ type: 'GAME_STATUS_UPDATE', status: 'gameover' });
                } else if (collision.shouldFreeze) {
                    state.setPlayerFrozen(collision.player.id, true);
                    this.network.broadcast({ type: 'PLAYER_FROZEN', playerId: collision.player.id, isFrozen: true });

                    // Guard returns to patrol after freezing player
                    if (enemyData.type === 'guard') {
                        state.updateEnemyPosition(
                            enemyData.id,
                            enemyData.position.x,
                            enemyData.position.y,
                            'patrolling',
                            undefined,
                            undefined,
                            0
                        );
                        this.network.broadcast({
                            type: 'ENEMY_MOVE',
                            enemyId: enemyData.id,
                            x: enemyData.position.x,
                            y: enemyData.position.y,
                            state: 'patrolling',
                            targetId: undefined,
                            targetPos: undefined,
                            investigationTimer: 0
                        });
                    }
                }
            });
        });

        // Check player-to-player collisions for unfreezing
        const playersToUnfreeze = CollisionSystem.checkPlayerUnfreezeCollisions(lobby.players);
        playersToUnfreeze.forEach(playerId => {
            state.setPlayerFrozen(playerId, false);
            this.network.broadcast({ type: 'PLAYER_FROZEN', playerId, isFrozen: false });
        });

        // Handle spawning/removing
        if (newEnemies.length > 0 || enemiesToRemove.length > 0) {
            const currentEnemies = [...lobby.enemies];
            const filteredEnemies = currentEnemies.filter((e: EnemyType) => !enemiesToRemove.includes(e.id));
            const finalEnemies = [...filteredEnemies, ...newEnemies];
            state.lobby.enemies = finalEnemies;
            this.network.broadcast({ type: 'LOBBY_UPDATE', enemies: finalEnemies });
        }
    }

    /**
     * Stop the game loop and cleanup
     */
    destroy(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        inputHandler.detach();
        this.enemyInstances.clear();
    }
}
