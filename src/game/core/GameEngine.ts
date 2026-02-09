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

    private updateIntervalId?: any;

    /**
     * Start the game loop
     */
    start(): void {
        this.stop();

        const loop = (timestamp: number) => {
            if (!this.lastFrameTime) {
                this.lastFrameTime = timestamp;
                this.animationFrameId = requestAnimationFrame(loop);
                return;
            }
            const deltaTime = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
            this.lastFrameTime = timestamp;

            this.update(deltaTime, timestamp);
            this.render(timestamp);

            this.animationFrameId = requestAnimationFrame(loop);
        };

        const startBackgroundLoop = () => {
            if (this.updateIntervalId) clearInterval(this.updateIntervalId);
            let lastUpdateTime = performance.now();
            this.updateIntervalId = setInterval(() => {
                const now = performance.now();
                const deltaTime = Math.min((now - lastUpdateTime) / 1000, 0.1);
                lastUpdateTime = now;
                this.update(deltaTime, now);
            }, 1000 / 60); // Use 60fps for background too if we want speed accuracy
        };

        // Simplified visibility handling
        this.lastFrameTime = 0;
        if (document.hidden) {
            startBackgroundLoop();
        } else {
            this.animationFrameId = requestAnimationFrame(loop);
        }
    }

    /**
     * Stop the game loop
     */
    stop(): void {
        if (this.updateIntervalId) {
            clearInterval(this.updateIntervalId);
            this.updateIntervalId = undefined;
        }
        if (this.animationFrameId !== undefined) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = undefined;
        }
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

        // Vision / Fog of War Spotlight
        this.renderVision();
    }

    /**
     * Render the vision spotlight around the local player
     */
    private renderVision(): void {
        const { width, height } = this.camera.viewport;
        const px = this.playerPos.x - this.camera.x;
        const py = this.playerPos.y - this.camera.y;
        const radius = GameConfig.VISION_RADIUS;

        this.ctx.save();

        // 1. Draw solid darkness outside the vision circle
        // We use a rect with        // 1. Draw solid darkness outside the vision circle
        this.ctx.beginPath();
        this.ctx.rect(0, 0, width, height);
        this.ctx.arc(px, py, radius, 0, Math.PI * 2, true);
        this.ctx.fillStyle = 'rgba(2, 6, 23, 1)'; // Solid dark blue (100% opaque)
        this.ctx.fill();

        // 2. Add a soft gradient falloff to the vision edge
        const gradient = this.ctx.createRadialGradient(px, py, radius * 0.4, px, py, radius);
        gradient.addColorStop(0, 'rgba(2, 6, 23, 0)');      // Center clear
        gradient.addColorStop(1, 'rgba(2, 6, 23, 1)');      // Edge solid blue

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(px, py, radius + 1, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * Render all players
     */
    private playerInstances = new Map<string, Player>();

    /**
     * Render all players
     */
    private renderPlayers(players: PlayerType[], localPlayerId: string, timestamp: number): void {
        const currentIds = new Set(players.map(p => p.id));

        // Cleanup missing players
        for (const id of this.playerInstances.keys()) {
            if (!currentIds.has(id)) this.playerInstances.delete(id);
        }

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

                // Smooth interpolation for remote players
                const lerpAmount = 0.2; // Optimized for 60fps
                this.remoteDisplayPos[p.id].x += (targetX - this.remoteDisplayPos[p.id].x) * lerpAmount;
                this.remoteDisplayPos[p.id].y += (targetY - this.remoteDisplayPos[p.id].y) * lerpAmount;

                worldX = this.remoteDisplayPos[p.id].x;
                worldY = this.remoteDisplayPos[p.id].y;
            }

            // Update or create player instance
            if (!this.playerInstances.has(p.id)) {
                this.playerInstances.set(p.id, new Player({ ...p, position: { x: worldX, y: worldY } }));
            } else {
                const instance = this.playerInstances.get(p.id)!;
                // We need to manually update the internal data since Player class wraps it
                // This assumes Player class has a way to update its data or we recreate it if data changes significantly
                // ideally Player should have an update method. For now, to be safe with existing class structure:
                instance['data'] = { ...p, position: { x: worldX, y: worldY } };
            }

            const player = this.playerInstances.get(p.id)!;
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
        const enemiesToUpdate: Record<string, Partial<EnemyType>> = {};

        // Throttle enemy updates to 30fps to save bandwidth
        const shouldBroadcast = timestamp - this.lastEnemySync > GameConfig.NETWORK_UPDATE_INTERVAL;
        if (shouldBroadcast) {
            this.lastEnemySync = timestamp;
        }

        lobby.enemies.forEach((enemyData: EnemyType) => {
            if ((enemyData.state as any) === 'gone') return;

            const initialState = enemyData.state;

            // Use the centralized AI system
            EnemyAI.update(enemyData, {
                deltaTime,
                players: lobby.players,
                doors: lobby.doors,
                allEnemies: lobby.enemies,
                broadcast: (msg) => {
                    // Always broadcast critical events (alarms, state changes)
                    if (msg.type !== 'ENEMY_MOVE' || shouldBroadcast || msg.state !== initialState) {
                        this.network.broadcast(msg);
                    }
                },
                updateEnemy: (id, updates) => {
                    // Batch updates for store
                    if (!enemiesToUpdate[id]) enemiesToUpdate[id] = {};
                    Object.assign(enemiesToUpdate[id], updates);

                    // Update immediate object for subsequent AI/render logic in this frame
                    const enemy = lobby.enemies.find((e: EnemyType) => e.id === id);
                    if (enemy) Object.assign(enemy, updates);
                }
            });

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
                        enemiesToUpdate[enemyData.id] = {
                            ...enemiesToUpdate[enemyData.id],
                            state: 'patrolling',
                            targetPlayerId: undefined,
                            targetPosition: undefined,
                            investigationTimer: 0
                        };
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

        // Apply all batched updates at once to prevent lag
        if (Object.keys(enemiesToUpdate).length > 0) {
            state.lobby.enemies = lobby.enemies.map((e: EnemyType) =>
                enemiesToUpdate[e.id] ? { ...e, ...enemiesToUpdate[e.id] } : e
            );
        }

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
        this.stop();
        inputHandler.detach();
        this.enemyInstances.clear();
    }
}
