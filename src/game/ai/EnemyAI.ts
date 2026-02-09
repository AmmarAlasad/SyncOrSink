import { GameConfig } from '../core/GameConfig';
import { DetectionSystem } from './DetectionSystem';
import { AlarmSystem } from './AlarmSystem';
import { PatrolBehavior } from './behaviors/PatrolBehavior';
import { ChaseBehavior } from './behaviors/ChaseBehavior';
import { InvestigateBehavior } from './behaviors/InvestigateBehavior';
import type { Enemy, Player, Door } from '@/store/store';

export interface AIContext {
    deltaTime: number;
    players: Player[];
    doors: Door[];
    allEnemies: Enemy[];
    broadcast: (msg: any) => void;
    updateEnemy: (id: string, updates: Partial<Enemy>) => void;
}

export class EnemyAI {
    static update(enemy: Enemy, context: AIContext) {
        // Skip dead enemies
        if ((enemy.state as any) === 'gone') return;

        let nextX = enemy.position.x;
        let nextY = enemy.position.y;
        let nextState = enemy.state;
        let targetId = enemy.targetPlayerId;
        let targetPos = enemy.targetPosition;
        let investigationTimer = enemy.investigationTimer || 0;
        let shouldSync = false;

        // 1. Detection Phase
        // Check for players if we are patroling, returning, or investigating (and capable of detection)
        const canDetect = nextState === 'patrolling' || nextState === 'returning' || nextState === 'investigating';

        if (canDetect) {
            const range = GameConfig.getDetectionRange(enemy.type);
            const detected = DetectionSystem.detectPlayer(enemy, context.players, range);

            if (detected) {
                // If we see a player, we stay interested
                investigationTimer = 0;

                if (enemy.type === 'drone' || enemy.type === 'camera') {
                    // Trigger Alarm to call a guard
                    const now = context.deltaTime; // Not reliable, use Date.now() from context or pass it in
                    const currentTime = Date.now();
                    const lastTrigger = enemy.lastAlarmTriggered || 0;

                    if (context.doors.length > 0 && (currentTime - lastTrigger > GameConfig.ALARM_COOLDOWN)) {
                        const alarmResult = AlarmSystem.triggerAlarm(detected.player, context.doors, context.allEnemies);

                        // Update cooldown
                        context.updateEnemy(enemy.id, { lastAlarmTriggered: currentTime });

                        // Notify everyone of alarm location
                        context.broadcast({ type: 'ENEMY_ALARM', position: alarmResult.alarmPosition });

                        // Handle Existing Guard Response
                        if (alarmResult.respondingGuard) {
                            const rg = alarmResult.respondingGuard;
                            context.updateEnemy(rg.id, {
                                state: 'investigating',
                                targetPosition: rg.targetPosition,
                                investigationTimer: 0,
                                spawnDoorId: rg.spawnDoorId
                            });
                            context.broadcast({
                                type: 'ENEMY_MOVE',
                                enemyId: rg.id,
                                x: rg.position.x,
                                y: rg.position.y,
                                state: 'investigating',
                                targetPos: rg.targetPosition,
                                investigationTimer: 0
                            });
                        }
                    }

                    if (enemy.type === 'drone') {
                        // Drone: Switches to chasing to follow player
                        if (nextState !== 'chasing') {
                            nextState = 'chasing';
                            targetId = detected.player.id;
                            targetPos = undefined;
                            shouldSync = true;
                        }
                    } else {
                        // Camera: Switches to investigating (yellow glow)
                        if (nextState !== 'investigating') {
                            nextState = 'investigating';
                            shouldSync = true;
                        }
                        // Update target pos to where player is (for looking)
                        if (detected.player.position) {
                            targetPos = { x: detected.player.position.x, y: detected.player.position.y };
                        }
                    }

                } else {
                    // Guard/Dog: Switch to chasing
                    if (nextState !== 'chasing') {
                        nextState = 'chasing';
                        targetId = detected.player.id;
                        shouldSync = true;
                    }
                }
            } else {
                // No player detected logic
                if (nextState === 'investigating') {
                    // Camera/Drone lost sight
                    // Stay in investigating until timer expires
                }
            }
        }

        // 2. Behavior Phase
        if (nextState === 'chasing' && targetId) {
            const target = context.players.find(p => p.id === targetId);

            // Check max chase distance for Drone
            if (enemy.type === 'drone' && target?.position) {
                const dist = Math.hypot(target.position.x - enemy.position.x, target.position.y - enemy.position.y);
                if (dist > GameConfig.GRID_SIZE) { // 1 Block range
                    // Lost target
                    nextState = 'investigating'; // Pause briefly
                    targetId = undefined;
                    targetPos = { x: enemy.position.x, y: enemy.position.y };
                    investigationTimer = 0;
                    shouldSync = true;
                }
            }

            if (nextState === 'chasing') {
                const result = ChaseBehavior.update(enemy, target, context.deltaTime);
                if (result) {
                    nextX = result.x;
                    nextY = result.y;
                } else {
                    // Target lost or out of range
                    if (enemy.type === 'drone') {
                        nextState = 'investigating';
                        targetPos = { x: enemy.position.x, y: enemy.position.y };
                        investigationTimer = 0;
                    } else {
                        nextState = 'returning';
                        targetPos = enemy.patrolPoints[enemy.patrolIndex];
                    }
                    targetId = undefined;
                    shouldSync = true;
                }
            }
        }
        else if (nextState === 'investigating') {
            // Camera/Drone logic for "Cooldown"
            if (enemy.type === 'camera' || enemy.type === 'drone') {
                investigationTimer += context.deltaTime;
                if (investigationTimer >= 1.0) { // 1 Second wait
                    nextState = enemy.type === 'drone' ? 'returning' : 'patrolling'; // Drones return, Cameras patrol
                    if (enemy.type === 'drone') {
                        targetPos = enemy.patrolPoints[enemy.patrolIndex];
                    } else {
                        targetPos = undefined;
                    }
                    investigationTimer = 0;
                    shouldSync = true;
                }
            } else {
                // Guard investigation logic
                if (targetPos) {
                    // Temporarily construct the investigating state for the update function
                    const tempEnemy = { ...enemy, state: nextState, targetPosition: targetPos, investigationTimer };
                    const result = InvestigateBehavior.update(tempEnemy, context.deltaTime, context.doors);
                    nextX = result.x;
                    nextY = result.y;
                    investigationTimer = result.timer;

                    if (result.shouldReturn) {
                        nextState = 'returning';
                        targetPos = result.returnTarget;
                        shouldSync = true;
                    }
                }
            }
        }
        else if (nextState === 'returning') {
            const target = targetPos || enemy.patrolPoints[0];
            const dist = Math.hypot(target.x - enemy.position.x, target.y - enemy.position.y);

            if (dist < 5) {
                if (enemy.type === 'guard' && enemy.spawnDoorId) {
                    // Despawn spawned guards
                    context.updateEnemy(enemy.id, { state: 'gone' as any }); // Hacky way to remove
                    return { remove: true };
                } else {
                    nextState = 'patrolling';
                    targetPos = undefined;
                    shouldSync = true;
                }
            } else {
                const speed = GameConfig.getEnemySpeed(enemy.type, 'patrol');
                const angle = Math.atan2(target.y - enemy.position.y, target.x - enemy.position.x);
                nextX += Math.cos(angle) * speed * context.deltaTime;
                nextY += Math.sin(angle) * speed * context.deltaTime;
            }
        }
        else if (nextState === 'patrolling') {
            const result = PatrolBehavior.update(enemy, context.deltaTime);
            nextX = result.x;
            nextY = result.y;
            if (result.patrolIndex !== undefined) {
                context.updateEnemy(enemy.id, { patrolIndex: result.patrolIndex });
            }
        }

        // 3. Sync Phase
        const now = Date.now();
        const timeSinceLastSync = now - (enemy.lastNetworkSync || 0);
        const SYNC_INTERVAL = 33; // 30 updates per second

        // Always update local store state so movement is smooth and full-speed
        context.updateEnemy(enemy.id, {
            position: { x: nextX, y: nextY },
            state: nextState,
            targetPlayerId: targetId,
            targetPosition: targetPos,
            investigationTimer
        });

        // Throttle network broadcast to save bandwidth
        const needsBroadcast =
            shouldSync ||
            nextState !== enemy.state ||
            targetId !== enemy.targetPlayerId ||
            timeSinceLastSync > SYNC_INTERVAL;

        if (needsBroadcast) {
            context.updateEnemy(enemy.id, { lastNetworkSync: now });
            context.broadcast({
                type: 'ENEMY_MOVE',
                enemyId: enemy.id,
                x: nextX,
                y: nextY,
                state: nextState,
                targetId,
                targetPos,
                investigationTimer
            });
        }

        return {};
    }
}
