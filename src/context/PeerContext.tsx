'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { useStore } from '@/store/store';

type PeerContextType = {
    peer: Peer | null;
    connections: DataConnection[];
    connectToHost: (hostPeerId: string, playerInfo: any) => void;
    broadcast: (data: any) => void;
    sendToHost: (data: any) => void;
};

const PeerContext = createContext<PeerContextType | null>(null);

export const usePeer = () => {
    const context = useContext(PeerContext);
    if (!context) throw new Error('usePeer must be used within a PeerProvider');
    return context;
};

export const PeerProvider = ({ children }: { children: React.ReactNode }) => {
    const [peer, setPeer] = useState<Peer | null>(null);
    const [connections, setConnections] = useState<DataConnection[]>([]);
    const { localPlayer, setLocalPeerId, addPlayer, removePlayer, updatePlayerPosition, setGameStatus, setCollection, resetLobby, lobby, lastJoinedLobby } = useStore();
    const connectionsRef = useRef<DataConnection[]>([]);

    useEffect(() => {
        // Initialize Peer
        const newPeer = new Peer();

        newPeer.on('open', (id) => {
            console.log('My Peer ID is: ' + id);
            setLocalPeerId(id);
            setPeer(newPeer);
        });

        newPeer.on('connection', (conn) => {
            console.log('Incoming connection from:', conn.peer);

            conn.on('data', (data: any) => {
                handleData(data, conn);
            });

            conn.on('open', () => {
                setConnections(prev => {
                    const newConns = [...prev, conn];
                    connectionsRef.current = newConns;
                    return newConns;
                });
            });

            conn.on('close', () => {
                console.log('Connection closed:', conn.peer);
                setConnections(prev => {
                    const newConns = prev.filter(c => c.peer !== conn.peer);
                    connectionsRef.current = newConns;
                    return newConns;
                });
                // We can't easily find which player disconnected without mapping
                // But handleData 'KICKED' or heartbeat would handle this.
            });
        });

        return () => {
            newPeer.destroy();
        };
    }, []);

    // Auto-reconnect effect
    useEffect(() => {
        if (peer && localPlayer.peerId && lastJoinedLobby && !lobby.hostPeerId) {
            if (localPlayer.peerId === lastJoinedLobby.hostPeerId) {
                // I am the host (reloaded)
                // Restore lobby state? 
                // The problem is we lost the players list in memory.
                // A true reconnect for host requires players to re-join and host to accept.
                // Or host persists players.
                // For now, if host refreshes, lobby is technically dead until they re-create/re-hydrate.
                // Let's at least populate the lobby ID
                useStore.setState(state => ({
                    lobby: {
                        ...state.lobby,
                        id: lastJoinedLobby.id,
                        hostPeerId: lastJoinedLobby.hostPeerId,
                        status: 'lobby',
                        players: [{ ...localPlayer, isHost: true, peerId: localPlayer.peerId! }]
                    }
                }));
            } else {
                // I am a client, try to reconnect to host
                console.log('Attempting to reconnect to host:', lastJoinedLobby.hostPeerId);
                connectToHost(lastJoinedLobby.hostPeerId, localPlayer);
            }
        }
    }, [peer, localPlayer.peerId]);

    const handleData = (data: any, conn: DataConnection) => {
        switch (data.type) {
            case 'JOIN_REQUEST':
                const currentPlayers = useStore.getState().lobby.players;
                if (currentPlayers.length >= 10 && !currentPlayers.find(p => p.id === data.player.id)) {
                    conn.send({ type: 'KICKED' });
                    conn.close();
                    return;
                }

                const existingPlayer = currentPlayers.find(p => p.id === data.player.id);
                const newPlayer = { ...data.player, peerId: conn.peer, isHost: false };
                addPlayer(newPlayer);

                // Use latest state after add
                const currentLobby = useStore.getState().lobby;
                conn.send({ type: 'LOBBY_SYNC', lobbyState: currentLobby });

                // Broadcast to OLD players that a NEW (or returning) player joined
                connectionsRef.current.forEach(c => {
                    if (c.peer !== conn.peer && c.open) {
                        c.send({ type: 'LOBBY_UPDATE', players: currentLobby.players });
                    }
                });
                break;

            case 'LOBBY_SYNC':
                // Client syncs full state
                useStore.setState(state => ({
                    lobby: {
                        ...state.lobby,
                        players: data.lobbyState.players,
                        status: data.lobbyState.status,
                        selectedCollection: data.lobbyState.selectedCollection,
                        hostPeerId: state.lastJoinedLobby?.hostPeerId || null // Ensure hostPeerId is set
                    }
                }));
                break;

            case 'LOBBY_UPDATE':
                useStore.setState(state => ({
                    lobby: { ...state.lobby, players: data.players }
                }));
                break;

            case 'KICK_PLAYER':
                if (data.targetId === localPlayer.id) {
                    alert('You have been kicked from the lobby.');
                    resetLobby();
                }
                break;

            case 'KICKED':
                alert('You have been kicked from the lobby.');
                resetLobby();
                conn.close();
                break;

            case 'GAME_START':
                setGameStatus('playing');
                break;

            case 'COLLECTION_SELECTED':
                setCollection(data.collection);
                break;

            case 'PLAYER_MOVE':
                updatePlayerPosition(data.playerId, data.x, data.y);
                break;

            default:
                break;
        }
    };

    const connectToHost = (hostPeerId: string, playerInfo: any) => {
        if (!peer) return;
        const conn = peer.connect(hostPeerId);

        conn.on('open', () => {
            setConnections([conn]);
            connectionsRef.current = [conn];
            conn.send({ type: 'JOIN_REQUEST', player: playerInfo });
        });

        conn.on('data', (data) => handleData(data, conn));

        conn.on('close', () => {
            // If host disconnects, game over or wait?
            console.log('Host disconnected');
            // Reset lobby?
            // Maybe don't reset immediately to allow host refresh?
            // But for now, simple approach:
            // resetLobby(); 
            // alert('Host disconnected');
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
        });
    };

    const broadcast = (data: any) => {
        connectionsRef.current.forEach(conn => {
            if (conn.open) conn.send(data);
        });
    };

    const sendToHost = (data: any) => {
        if (connectionsRef.current.length > 0) {
            connectionsRef.current[0].send(data);
        }
    };

    return (
        <PeerContext.Provider value={{ peer, connections, connectToHost, broadcast, sendToHost }}>
            {children}
        </PeerContext.Provider>
    );
};
