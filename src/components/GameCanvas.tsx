'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStore, Enemy, Door } from '@/store/store';
import { usePeer } from '@/context/PeerContext';
import { ArrowLeft, Settings as SettingsIcon, Users, RefreshCw } from 'lucide-react';
import Settings from './GameSettings';

export default function GameCanvas() {
    const { setGameStatus, lobby, localPlayer, updatePlayerPosition, updateEnemyPosition, setPlayerFrozen, settings } = useStore();
    const { broadcast } = usePeer();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [showSettings, setShowSettings] = useState(false);

    // Use refs to avoid loop restarts on every store update
    const lobbyRef = useRef(lobby);
    const localPlayerRef = useRef(localPlayer);
    useEffect(() => { lobbyRef.current = lobby; }, [lobby]);
    useEffect(() => { localPlayerRef.current = localPlayer; }, [localPlayer]);

    // Movement state
    const keysPressed = useRef<Record<string, boolean>>({});
    const mousePos = useRef({ x: 0, y: 0 });
    const lastUpdate = useRef(0);
    const lastFrameTime = useRef(0);

    // World coordinates
    const GRID_SIZE = 64;
    const MAP_BLOCKS = 16;
    const WORLD_SIZE = GRID_SIZE * MAP_BLOCKS;
    const CENTER_POS = (MAP_BLOCKS / 2) * GRID_SIZE + (GRID_SIZE / 2);

    const playerPos = useRef({ x: CENTER_POS, y: CENTER_POS });
    const remoteDisplayPos = useRef<Record<string, { x: number, y: number }>>({});

    // Initialize position and handle restarts
    useEffect(() => {
        if (lobby.status === 'playing') {
            const myPlayer = lobby.players.find(p => p.id === localPlayer.id);
            if (myPlayer?.position) {
                playerPos.current = { ...myPlayer.position };
                remoteDisplayPos.current = {};
            }
        }
    }, [lobby.status]);

    // Input handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
        const handleMouseMove = (e: MouseEvent) => {
            mousePos.current = { x: e.clientX, y: e.clientY };
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    // Game Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let animationFrameId: number;

        const render = (timestamp: number) => {
            if (!lastFrameTime.current) lastFrameTime.current = timestamp;
            const deltaTime = Math.min((timestamp - lastFrameTime.current) / 1000, 0.1);
            lastFrameTime.current = timestamp;

            if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            // --- MOVEMENT ---
            const myState = lobbyRef.current.players.find(p => p.id === localPlayerRef.current.id);
            const isFrozen = myState?.isFrozen;
            const isGameOver = lobbyRef.current.status === 'gameover';

            const PLAYER_SPEED_BLOCKS_PER_SEC = 3.5;
            const BASE_SPEED = GRID_SIZE * PLAYER_SPEED_BLOCKS_PER_SEC;
            const speed = BASE_SPEED * deltaTime;
            let moved = false;

            if (!isFrozen && !isGameOver && lobbyRef.current.status === 'playing') {
                if (keysPressed.current[settings.keybinds.up] || keysPressed.current['KeyW']) { playerPos.current.y -= speed; moved = true; }
                if (keysPressed.current[settings.keybinds.down] || keysPressed.current['KeyS']) { playerPos.current.y += speed; moved = true; }
                if (keysPressed.current[settings.keybinds.left] || keysPressed.current['KeyA']) { playerPos.current.x -= speed; moved = true; }
                if (keysPressed.current[settings.keybinds.right] || keysPressed.current['KeyD']) { playerPos.current.x += speed; moved = true; }
            }

            playerPos.current.x = Math.max(32, Math.min(WORLD_SIZE - 32, playerPos.current.x));
            playerPos.current.y = Math.max(32, Math.min(WORLD_SIZE - 32, playerPos.current.y));

            if (moved && timestamp - lastUpdate.current > 33) {
                updatePlayerPosition(localPlayerRef.current.id, playerPos.current.x, playerPos.current.y);
                broadcast({
                    type: 'PLAYER_MOVE',
                    playerId: localPlayerRef.current.id,
                    x: playerPos.current.x,
                    y: playerPos.current.y
                });
                lastUpdate.current = timestamp;
            }

            // --- ENEMY AI (Host Only) ---
            const isHost = localPlayerRef.current.id === (lobbyRef.current.players.find(p => p.isHost)?.id as string);
            if (isHost && lobbyRef.current.status === 'playing') {
                const enemiesToRemove: string[] = [];
                const newEnemies: Enemy[] = [];

                lobbyRef.current.enemies.forEach(enemy => {
                    if (enemy.state === ('gone' as any)) return;

                    const isDog = enemy.type === 'dog';
                    const isDrone = enemy.type === 'drone';
                    const isGuard = enemy.type === 'guard';

                    let ENEMY_PATROL_SPEED = GRID_SIZE * (isDog ? 2.0 : isDrone ? 2.5 : 1.5);
                    let ENEMY_CHASE_SPEED = GRID_SIZE * (isDog ? 3.5 : isDrone ? 0 : 2.5);
                    if (isGuard && enemy.state === 'investigating') {
                        // Guard responding to alarm is 1.5x player speed
                        ENEMY_CHASE_SPEED = BASE_SPEED * 1.5;
                    }

                    const DETECT_RANGE = GRID_SIZE * (isDog ? 5 : isDrone ? 2 : 2);

                    let nextX = enemy.position.x;
                    let nextY = enemy.position.y;
                    let nextState = enemy.state;
                    let targetId = enemy.targetPlayerId;
                    let targetPos = enemy.targetPosition;
                    let investigationTimer = enemy.investigationTimer || 0;

                    // --- Detection Logic (Guard & Dog & Drone) ---
                    if (nextState === 'patrolling' || nextState === 'returning') {
                        let closestPlayer: any = null;
                        let minDist = DETECT_RANGE;

                        lobbyRef.current.players.forEach(p => {
                            if (!p.position || p.isFrozen) return;

                            const dy = Math.abs(p.position.y - enemy.position.y);
                            const dx = Math.abs(p.position.x - enemy.position.x);

                            // Restricted to Horizontal View (same row, within range)
                            if (dy < 32 && dx < DETECT_RANGE) {
                                if (dx < minDist) {
                                    minDist = dx;
                                    closestPlayer = p;
                                }
                            }
                        });

                        if (closestPlayer) {
                            if (isDrone || enemy.type === 'camera') {
                                const targetBlockX = Math.floor(closestPlayer.position.x / GRID_SIZE) * GRID_SIZE + 32;
                                const targetBlockY = Math.floor(closestPlayer.position.y / GRID_SIZE) * GRID_SIZE + 32;
                                const alarmTarget = { x: targetBlockX, y: targetBlockY };

                                broadcast({ type: 'ENEMY_ALARM', position: alarmTarget });

                                const doors = lobbyRef.current.doors;
                                const nearestDoor = doors.reduce((prev, curr) => {
                                    const dPrev = Math.hypot(prev.position.x - alarmTarget.x, prev.position.y - alarmTarget.y);
                                    const dCurr = Math.hypot(curr.position.x - alarmTarget.x, curr.position.y - alarmTarget.y);
                                    return dCurr < dPrev ? curr : prev;
                                });

                                // Filter for guards that are either patrolling or already investigating this specific alarm
                                let respondingGuard = lobbyRef.current.enemies.find(e =>
                                    e.type === 'guard' &&
                                    (e.state === 'patrolling' || (e.state === 'investigating' && e.id.includes('guard')))
                                );

                                if (respondingGuard) {
                                    respondingGuard.state = 'investigating';
                                    respondingGuard.targetPosition = { ...alarmTarget };
                                    respondingGuard.investigationTimer = 0; // Reset timer while player is still seen
                                    respondingGuard.spawnDoorId = nearestDoor.id;
                                } else {
                                    const newGuard: Enemy = {
                                        id: `spawned-guard-${Date.now()}`,
                                        type: 'guard',
                                        position: { ...nearestDoor.position },
                                        state: 'investigating',
                                        targetPosition: { ...alarmTarget },
                                        patrolIndex: 0,
                                        patrolPoints: [{ ...nearestDoor.position }],
                                        spawnDoorId: nearestDoor.id,
                                        investigationTimer: 0
                                    };
                                    newEnemies.push(newGuard);
                                }
                            } else {
                                nextState = 'chasing';
                                targetId = closestPlayer.id;
                            }
                        }
                    }

                    // --- Movement State Machines ---
                    if (nextState === 'chasing' && targetId) {
                        const target = lobbyRef.current.players.find(p => p.id === targetId);
                        if (target?.position) {
                            const angle = Math.atan2(target.position.y - enemy.position.y, target.position.x - enemy.position.x);
                            nextX += Math.cos(angle) * ENEMY_CHASE_SPEED * deltaTime;
                            nextY += Math.sin(angle) * ENEMY_CHASE_SPEED * deltaTime;
                        }
                    } else if (nextState === 'investigating' && targetPos) {
                        const distToTarget = Math.hypot(targetPos.x - nextX, targetPos.y - nextY);
                        if (distToTarget > 10) {
                            // Move to investigation area at 1.5x speed
                            const angle = Math.atan2(targetPos.y - nextY, targetPos.x - nextX);
                            nextX += Math.cos(angle) * ENEMY_CHASE_SPEED * deltaTime;
                            nextY += Math.sin(angle) * ENEMY_CHASE_SPEED * deltaTime;
                        } else {
                            // Stay for 8 seconds
                            investigationTimer += deltaTime;
                            if (investigationTimer >= 8) {
                                nextState = 'returning';
                                const door = lobbyRef.current.doors.find(d => d.id === enemy.spawnDoorId);
                                if (door) {
                                    targetPos = { ...door.position };
                                }
                            }
                        }
                    } else if (nextState === 'returning') {
                        const target = targetPos || enemy.patrolPoints[0];
                        const dist = Math.hypot(target.x - enemy.position.x, target.y - enemy.position.y);
                        if (dist < 5) {
                            if (isGuard && enemy.spawnDoorId) {
                                // Spawning guard returns to door and disappears
                                enemiesToRemove.push(enemy.id);
                            } else {
                                nextState = 'patrolling';
                                targetPos = undefined;
                            }
                        } else {
                            const angle = Math.atan2(target.y - enemy.position.y, target.x - enemy.position.x);
                            nextX += Math.cos(angle) * ENEMY_PATROL_SPEED * deltaTime;
                            nextY += Math.sin(angle) * ENEMY_PATROL_SPEED * deltaTime;
                        }
                    } else if (nextState === 'patrolling') {
                        const target = enemy.patrolPoints[enemy.patrolIndex];
                        const dist = Math.hypot(target.x - enemy.position.x, target.y - enemy.position.y);
                        if (dist < 5) {
                            enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPoints.length;
                        } else {
                            const angle = Math.atan2(target.y - enemy.position.y, target.x - enemy.position.x);
                            nextX += Math.cos(angle) * ENEMY_PATROL_SPEED * deltaTime;
                            nextY += Math.sin(angle) * ENEMY_PATROL_SPEED * deltaTime;
                        }
                    }

                    // --- Collision with players ---
                    lobbyRef.current.players.forEach(p => {
                        if (!p.position) return;
                        const d = Math.hypot(p.position.x - nextX, p.position.y - nextY);
                        if (d < 40) {
                            if (isDog) {
                                setGameStatus('gameover');
                                broadcast({ type: 'GAME_STATUS_UPDATE', status: 'gameover' });
                            } else if (isGuard && !p.isFrozen) {
                                setPlayerFrozen(p.id, true);
                                broadcast({ type: 'PLAYER_FROZEN', playerId: p.id, isFrozen: true });
                            }
                        }
                    });

                    // Sync Host changes
                    if (nextX !== enemy.position.x || nextY !== enemy.position.y || nextState !== enemy.state) {
                        enemy.investigationTimer = investigationTimer; // local update
                        enemy.targetPosition = targetPos;
                        updateEnemyPosition(enemy.id, nextX, nextY, nextState, targetId);
                        broadcast({
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
                });

                // Handle spawning/removing enemies
                if (newEnemies.length > 0 || enemiesToRemove.length > 0) {
                    const currentEnemies = [...lobbyRef.current.enemies];
                    const filteredEnemies = currentEnemies.filter(e => !enemiesToRemove.includes(e.id));
                    const finalEnemies = [...filteredEnemies, ...newEnemies];
                    useStore.setState(state => ({ lobby: { ...state.lobby, enemies: finalEnemies } }));
                    broadcast({ type: 'LOBBY_UPDATE', enemies: finalEnemies });
                }
            }

            // --- RENDERING ---
            const camX = playerPos.current.x - canvas.width / 2;
            const camY = playerPos.current.y - canvas.height / 2;

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Grid
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            const startX = -(camX % GRID_SIZE);
            const startY = -(camY % GRID_SIZE);
            for (let x = startX; x < canvas.width; x += GRID_SIZE) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            }
            for (let y = startY; y < canvas.height; y += GRID_SIZE) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            }

            // Draw Doors
            lobbyRef.current.doors.forEach(door => {
                const dx = door.position.x - camX;
                const dy = door.position.y - camY;
                const size = 64;
                ctx.fillStyle = '#475569'; // Slate-600
                ctx.fillRect(dx - size / 2, dy - size / 2, size, size);
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 4;
                ctx.strokeRect(dx - size / 2, dy - size / 2, size, size);

                // Door handle/decoration
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(dx + 20, dy, 4, 0, Math.PI * 2);
                ctx.fill();
            });

            // World Boundary
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 5;
            ctx.strokeRect(-camX, -camY, WORLD_SIZE, WORLD_SIZE);

            // Draw Enemies
            lobbyRef.current.enemies.forEach(enemy => {
                const ex = enemy.position.x - camX;
                const ey = enemy.position.y - camY;
                const isDrone = enemy.type === 'drone';
                const isDog = enemy.type === 'dog';
                const size = isDog ? 48 : 64;

                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(ex - size / 2 + 4, ey - size / 2 + 4, size, size);

                if (isDrone) {
                    ctx.fillStyle = '#eab308'; // Yellow-500
                    ctx.beginPath();
                    ctx.moveTo(ex, ey - size / 2);
                    ctx.lineTo(ex + size / 2, ey);
                    ctx.lineTo(ex, ey + size / 2);
                    ctx.lineTo(ex - size / 2, ey);
                    ctx.closePath();
                    ctx.fill();
                    // Propellers visual
                    ctx.strokeStyle = '#713f12';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(ex - size / 2, ey - size / 2); ctx.lineTo(ex + size / 2, ey + size / 2);
                    ctx.moveTo(ex + size / 2, ey - size / 2); ctx.lineTo(ex - size / 2, ey + size / 2);
                    ctx.stroke();
                } else if (enemy.type === 'camera') {
                    ctx.fillStyle = '#78350f'; // Brown
                    ctx.beginPath();
                    ctx.roundRect(ex - size / 2, ey - size / 2, size, size, 4);
                    ctx.fill();
                    // Lens
                    ctx.fillStyle = '#1e293b';
                    ctx.beginPath();
                    ctx.arc(ex, ey, size / 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else {
                    ctx.fillStyle = isDog ? '#000000' : '#94a3b8';
                    ctx.beginPath();
                    ctx.roundRect(ex - size / 2, ey - size / 2, size, size, 4);
                    ctx.fill();
                }

                if (enemy.state === 'chasing' || enemy.state === 'investigating') {
                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    ctx.fillStyle = '#ef4444';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(enemy.state === 'investigating' ? '?' : '!', ex, ey - size / 2 - 10);
                }
            });

            // Draw Players
            lobbyRef.current.players.forEach(p => {
                const isMe = p.id === localPlayerRef.current.id;
                let worldX, worldY;

                if (isMe) {
                    worldX = playerPos.current.x;
                    worldY = playerPos.current.y;
                } else {
                    const targetX = p.position?.x ?? CENTER_POS;
                    const targetY = p.position?.y ?? CENTER_POS;
                    if (!remoteDisplayPos.current[p.id]) remoteDisplayPos.current[p.id] = { x: targetX, y: targetY };
                    const lerpAmount = 1 - Math.exp(-15 * deltaTime);
                    remoteDisplayPos.current[p.id].x += (targetX - remoteDisplayPos.current[p.id].x) * lerpAmount;
                    remoteDisplayPos.current[p.id].y += (targetY - remoteDisplayPos.current[p.id].y) * lerpAmount;
                    worldX = remoteDisplayPos.current[p.id].x;
                    worldY = remoteDisplayPos.current[p.id].y;
                }

                const x = worldX - camX;
                const y = worldY - camY;
                if (x < -50 || x > canvas.width + 50 || y < -50 || y > canvas.height + 50) return;

                const size = 64;
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(x - size / 2 + 4, y - size / 2 + 4, size, size);
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.roundRect(x - size / 2, y - size / 2, size, size, 8); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.roundRect(x - size / 2, y - size / 2, size, size / 3, [8, 8, 0, 0]); ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.stroke();

                const isHovered = Math.abs(mousePos.current.x - x) < size / 2 && Math.abs(mousePos.current.y - y) < size / 2;
                if (isHovered) {
                    const nameY = y - 45;
                    ctx.font = 'bold 16px sans-serif';
                    const nameWidth = ctx.measureText(p.name).width;
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                    ctx.beginPath(); ctx.roundRect(x - (nameWidth + 20) / 2, nameY - 20, nameWidth + 20, 25, 6); ctx.fill();
                    ctx.fillStyle = '#f8fafc'; ctx.textAlign = 'center'; ctx.fillText(p.name, x, nameY);
                    if (isMe || p.isHost) {
                        ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = isMe ? '#818cf8' : '#f59e0b'; ctx.fillText(isMe ? 'YOU' : 'HOST', x, nameY - 22);
                    }
                }

                if (p.isFrozen) {
                    ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x - size / 2 - 5, y - size / 2 - 5, size + 10, size + 10, 8); ctx.stroke();
                    ctx.fillStyle = '#f43f5e'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('FROZEN', x, y + size / 2 + 20);
                }
            });

            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.font = '900 150px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(lobbyRef.current.selectedCollection || 'Sync', WORLD_SIZE / 2 - camX, WORLD_SIZE / 2 - camY);

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationFrameId);
    }, [settings.keybinds]);

    const handleRestart = () => {
        if (lobby.players.find(p => p.id === localPlayer.id)?.isHost) {
            setGameStatus('playing');
            const updatedLobby = useStore.getState().lobby;
            broadcast({ type: 'GAME_START', lobbyState: updatedLobby });
        }
    };

    return (
        <div className="relative w-full h-screen bg-slate-950 overflow-hidden select-none">
            <canvas ref={canvasRef} className="block cursor-default" />
            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                <div className="flex gap-4 pointer-events-auto">
                    <button onClick={() => setGameStatus('lobby')} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-slate-900/80 px-4 py-2 rounded-xl backdrop-blur-md border border-slate-800">
                        <ArrowLeft size={18} /> Exit
                    </button>
                    <div className="bg-slate-900/80 px-4 py-2 rounded-xl backdrop-blur-md border border-slate-800 text-slate-300 text-sm flex items-center gap-2">
                        <Users size={16} className="text-indigo-400" />
                        <span>{lobby.players.length} Players</span>
                        <span className="text-slate-600">|</span>
                        <span className="font-bold text-indigo-400 uppercase tracking-wider">{lobby.selectedCollection}</span>
                    </div>
                </div>
            </div>
            <div className="absolute top-4 right-4 z-20">
                <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-900/80 rounded-xl text-slate-400 hover:text-white transition-all hover:scale-110 border border-slate-800 backdrop-blur-md">
                    <SettingsIcon size={20} />
                </button>
            </div>
            {lobby.status === 'gameover' && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-in fade-in duration-500">
                    <div className="bg-slate-900 p-12 rounded-3xl border border-red-500/30 shadow-2xl shadow-red-500/10 flex flex-col items-center max-w-md text-center">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 text-red-500">
                            <RefreshCw size={40} className="animate-spin-slow" />
                        </div>
                        <h2 className="text-5xl font-black text-white mb-2 tracking-tighter uppercase italic">Game Over</h2>
                        <p className="text-slate-400 mb-8 leading-relaxed">The mission was compromised. Reset to try again.</p>
                        {localPlayer.id === lobby.players.find(p => p.isHost)?.id ? (
                            <button onClick={handleRestart} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-red-900/20 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                                <RefreshCw size={20} /> Restart Mission
                            </button>
                        ) : (
                            <div className="bg-slate-800 px-6 py-4 rounded-2xl text-slate-400 flex items-center gap-3">
                                <div className="animate-pulse w-2 h-2 bg-slate-500 rounded-full"></div> Waiting for Host to restart...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
