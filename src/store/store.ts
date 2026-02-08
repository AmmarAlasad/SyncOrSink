import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export type Player = {
    id: string;
    name: string;
    isHost: boolean;
    peerId: string;
    color: string;
    position?: { x: number; y: number };
    isFrozen?: boolean;
};

export type GameStatus = 'idle' | 'lobby' | 'playing' | 'gameover';

export type CollectionType = '2players' | '3players' | '4players' | '5players' | '6players' | '7players' | '8players' | '9players' | '10players' | 'chillout';

export type Enemy = {
    id: string;
    type: 'guard' | 'dog' | 'drone' | 'camera';
    position: { x: number; y: number };
    state: 'patrolling' | 'chasing' | 'returning' | 'investigating';
    targetPlayerId?: string;
    targetPosition?: { x: number; y: number };
    patrolIndex: number;
    patrolPoints: { x: number; y: number }[];
    investigationTimer?: number;
    spawnDoorId?: string;
};

export type Door = {
    id: string;
    position: { x: number; y: number };
};

export type AppState = {
    localPlayer: {
        id: string;
        name: string;
        peerId: string | null;
    };
    lobby: {
        id: string | null;
        hostPeerId: string | null;
        players: Player[];
        status: GameStatus;
        selectedCollection: CollectionType | null;
        enemies: Enemy[];
        doors: Door[];
        spawnGuard: boolean;
        spawnDog: boolean;
        spawnDrone: boolean;
        spawnCamera: boolean;
    };
    settings: {
        volume: number;
        keybinds: Record<string, string>;
    };
    lastJoinedLobby: {
        id: string;
        hostPeerId: string;
    } | null;

    // Actions
    setLocalPeerId: (peerId: string) => void;
    setPlayerName: (name: string) => void;
    createLobby: (hostPeerId: string) => void;
    joinLobby: (lobbyId: string, hostPeerId: string) => void;
    addPlayer: (player: Player) => void;
    removePlayer: (playerId: string) => void;
    updatePlayerPosition: (playerId: string, x: number, y: number) => void;
    updateEnemyPosition: (enemyId: string, x: number, y: number, state: Enemy['state'], targetId?: string, targetPos?: { x: number; y: number }, timer?: number) => void;
    setPlayerFrozen: (playerId: string, isFrozen: boolean) => void;
    setSpawnGuard: (spawn: boolean) => void;
    setSpawnDog: (spawn: boolean) => void;
    setSpawnDrone: (spawn: boolean) => void;
    setSpawnCamera: (spawn: boolean) => void;
    setGameStatus: (status: GameStatus) => void;
    setCollection: (collection: CollectionType) => void;
    updateSettings: (settings: Partial<AppState['settings']>) => void;
    resetLobby: () => void;
};

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            localPlayer: {
                id: uuidv4(),
                name: `Player-${Math.floor(Math.random() * 1000)}`,
                peerId: null,
            },
            lobby: {
                id: null,
                hostPeerId: null,
                players: [],
                status: 'idle',
                selectedCollection: null,
                enemies: [],
                doors: [],
                spawnGuard: true,
                spawnDog: true,
                spawnDrone: true,
                spawnCamera: true,
            },
            settings: {
                volume: 50,
                keybinds: {
                    up: 'ArrowUp',
                    down: 'ArrowDown',
                    left: 'ArrowLeft',
                    right: 'ArrowRight',
                },
            },
            lastJoinedLobby: null,

            setLocalPeerId: (peerId) => set((state) => ({ localPlayer: { ...state.localPlayer, peerId } })),
            setPlayerName: (name) => set((state) => ({ localPlayer: { ...state.localPlayer, name } })),

            createLobby: (hostPeerId) => {
                const id = uuidv4();
                set((state) => ({
                    lobby: {
                        ...state.lobby,
                        id: id,
                        hostPeerId,
                        status: 'lobby',
                        players: [{
                            id: state.localPlayer.id,
                            name: state.localPlayer.name,
                            isHost: true,
                            peerId: hostPeerId,
                            color: '#6366f1', // Indigo for host
                        }],
                    },
                    lastJoinedLobby: { id: id, hostPeerId }
                }));
            },

            joinLobby: (lobbyId, hostPeerId) => set((state) => ({
                lobby: {
                    ...state.lobby,
                    id: lobbyId,
                    hostPeerId,
                    status: 'lobby',
                },
                lastJoinedLobby: { id: lobbyId, hostPeerId }
            })),

            addPlayer: (player) => set((state) => {
                const existingPlayerIndex = state.lobby.players.findIndex(p => p.id === player.id);
                if (existingPlayerIndex !== -1) {
                    const newPlayers = [...state.lobby.players];
                    newPlayers[existingPlayerIndex] = player;
                    return { lobby: { ...state.lobby, players: newPlayers } };
                }

                // Assign a color if not provided
                const colors = ['#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];
                const usedColors = state.lobby.players.map(p => p.color);
                const availableColor = colors.find(c => !usedColors.includes(c)) || colors[0];
                const playerWithColor = { ...player, color: player.color || availableColor };

                return { lobby: { ...state.lobby, players: [...state.lobby.players, playerWithColor] } };
            }),

            removePlayer: (playerId) => set((state) => ({
                lobby: { ...state.lobby, players: state.lobby.players.filter(p => p.id !== playerId) }
            })),

            updatePlayerPosition: (playerId, x, y) => set((state) => {
                const players = state.lobby.players.map(p =>
                    p.id === playerId ? { ...p, position: { x, y } } : p
                );
                return { lobby: { ...state.lobby, players } };
            }),

            updateEnemyPosition: (id, x, y, status, targetId, targetPos, timer) => set((state) => ({
                lobby: {
                    ...state.lobby,
                    enemies: state.lobby.enemies.map((e) =>
                        e.id === id ? { ...e, position: { x, y }, state: status, targetPlayerId: targetId, targetPosition: targetPos, investigationTimer: timer } : e
                    ),
                },
            })),

            setPlayerFrozen: (playerId, isFrozen) => set((state) => {
                const players = state.lobby.players.map(p =>
                    p.id === playerId ? { ...p, isFrozen } : p
                );
                return { lobby: { ...state.lobby, players } };
            }),

            setSpawnGuard: (spawnGuard) => set((state) => ({ lobby: { ...state.lobby, spawnGuard } })),

            setSpawnDog: (spawnDog) => set((state) => ({ lobby: { ...state.lobby, spawnDog } })),

            setSpawnDrone: (spawnDrone) => set((state) => ({ lobby: { ...state.lobby, spawnDrone } })),

            setSpawnCamera: (spawnCamera) => set((state) => ({ lobby: { ...state.lobby, spawnCamera } })),

            setGameStatus: (status) => set((state) => {
                // Initialize enemies and randomize positions when game starts/restarts if I am host
                if (status === 'playing' && state.localPlayer.id === state.lobby.players.find(p => p.isHost)?.id) {
                    const GRID_SIZE = 64;
                    const MAP_BLOCKS = 16;

                    const getRandomPos = (margin = 2) => {
                        const bx = Math.floor(Math.random() * (MAP_BLOCKS - margin * 2)) + margin;
                        const by = Math.floor(Math.random() * (MAP_BLOCKS - margin * 2)) + margin;
                        return { x: bx * GRID_SIZE + 32, y: by * GRID_SIZE + 32 };
                    };

                    // Initialize Doors first (fixed positions near potential drone paths or random)
                    const doors: Door[] = [
                        { id: 'door-1', position: { x: 1 * GRID_SIZE + 32, y: 1 * GRID_SIZE + 32 } },
                        { id: 'door-2', position: { x: 14 * GRID_SIZE + 32, y: 1 * GRID_SIZE + 32 } },
                        { id: 'door-3', position: { x: 1 * GRID_SIZE + 32, y: 14 * GRID_SIZE + 32 } },
                        { id: 'door-4', position: { x: 14 * GRID_SIZE + 32, y: 14 * GRID_SIZE + 32 } },
                    ];

                    const enemies: Enemy[] = [];

                    if (state.lobby.spawnGuard) {
                        const row = Math.floor(Math.random() * (MAP_BLOCKS - 4)) + 2;
                        const startCol = Math.floor(Math.random() * 6) + 1;
                        const endCol = Math.floor(Math.random() * 6) + 8;
                        const start = { x: startCol * GRID_SIZE + 32, y: row * GRID_SIZE + 32 };
                        const end = { x: endCol * GRID_SIZE + 32, y: row * GRID_SIZE + 32 };
                        enemies.push({
                            id: 'guard-1',
                            type: 'guard',
                            position: { ...start },
                            state: 'patrolling',
                            patrolIndex: 0,
                            patrolPoints: [start, end]
                        });
                    }

                    if (state.lobby.spawnDog) {
                        const row = Math.floor(Math.random() * (MAP_BLOCKS - 4)) + 2;
                        const startCol = Math.floor(Math.random() * 5) + 1;
                        const endCol = Math.floor(Math.random() * 5) + 9;
                        const start = { x: startCol * GRID_SIZE + 32, y: row * GRID_SIZE + 32 };
                        const end = { x: endCol * GRID_SIZE + 32, y: row * GRID_SIZE + 32 };
                        enemies.push({
                            id: 'dog-1',
                            type: 'dog',
                            position: { ...start },
                            state: 'patrolling',
                            patrolIndex: 0,
                            patrolPoints: [start, end]
                        });
                    }

                    if (state.lobby.spawnDrone) {
                        const row = Math.floor(Math.random() * (MAP_BLOCKS - 4)) + 2;
                        const startCol = Math.floor(Math.random() * 4) + 2;
                        const endCol = Math.floor(Math.random() * 4) + 10;
                        const start = { x: startCol * GRID_SIZE + 32, y: row * GRID_SIZE + 32 };
                        const end = { x: endCol * GRID_SIZE + 32, y: row * GRID_SIZE + 32 };
                        enemies.push({
                            id: 'drone-1',
                            type: 'drone',
                            position: { ...start },
                            state: 'patrolling',
                            patrolIndex: 0,
                            patrolPoints: [start, end]
                        });
                    }

                    if (state.lobby.spawnCamera) {
                        const cameraPositions = [
                            { x: 4 * GRID_SIZE + 32, y: 4 * GRID_SIZE + 32 },
                            { x: 11 * GRID_SIZE + 32, y: 8 * GRID_SIZE + 32 },
                            { x: 4 * GRID_SIZE + 32, y: 11 * GRID_SIZE + 32 },
                        ];
                        cameraPositions.forEach((pos, i) => {
                            enemies.push({
                                id: `camera-${i + 1}`,
                                type: 'camera',
                                position: pos,
                                state: 'patrolling',
                                patrolIndex: 0,
                                patrolPoints: [pos]
                            });
                        });
                    }

                    // Randomize player positions
                    const randomizedPlayers = state.lobby.players.map(p => ({
                        ...p,
                        isFrozen: false,
                        position: getRandomPos()
                    }));

                    return { lobby: { ...state.lobby, status, enemies, players: randomizedPlayers, doors } };
                }
                return { lobby: { ...state.lobby, status } };
            }),
            setCollection: (collection) => set((state) => ({ lobby: { ...state.lobby, selectedCollection: collection } })),

            updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),

            resetLobby: () => set((state) => ({
                lobby: {
                    id: null,
                    hostPeerId: null,
                    players: [],
                    status: 'idle',
                    selectedCollection: null,
                    enemies: [],
                    doors: [],
                    spawnGuard: true,
                    spawnDog: true,
                    spawnDrone: true,
                    spawnCamera: true,
                },
                lastJoinedLobby: null
            })),
        }),
        {
            name: 'syncorsink-storage',
            partialize: (state) => ({
                settings: state.settings,
            }),
        }
    )
);
