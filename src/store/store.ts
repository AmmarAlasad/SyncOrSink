import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export type Player = {
    id: string;
    name: string;
    isHost: boolean;
    peerId: string;
    position?: { x: number; y: number };
};

export type GameStatus = 'idle' | 'lobby' | 'playing';

export type CollectionType = '2players' | '3players' | '4players' | '5players' | '6players' | '7players' | '8players' | '9players' | '10players' | 'chillout';

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
                return { lobby: { ...state.lobby, players: [...state.lobby.players, player] } };
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

            setGameStatus: (status) => set((state) => ({ lobby: { ...state.lobby, status } })),
            setCollection: (collection) => set((state) => ({ lobby: { ...state.lobby, selectedCollection: collection } })),

            updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),

            resetLobby: () => set((state) => ({
                lobby: {
                    id: null,
                    hostPeerId: null,
                    players: [],
                    status: 'idle',
                    selectedCollection: null,
                },
                lastJoinedLobby: null
            })),
        }),
        {
            name: 'syncorsink-storage',
            partialize: (state) => ({
                localPlayer: {
                    id: state.localPlayer.id,
                    name: state.localPlayer.name,
                    peerId: null
                },
                settings: state.settings,
                lastJoinedLobby: state.lastJoinedLobby
            }),
        }
    )
);
