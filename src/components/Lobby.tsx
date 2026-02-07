'use client';

import React, { useState } from 'react';
import { useStore, CollectionType } from '@/store/store';
import { usePeer } from '@/context/PeerContext';
import { Users, Play, LogOut, Copy, Check, Settings as SettingsIcon } from 'lucide-react';
import GameSettings from './GameSettings';

const COLLECTIONS: CollectionType[] = [
    '2players', '3players', '4players', '5players',
    '6players', '7players', '8players', '9players', '10players'
];

export default function Lobby() {
    const { lobby, localPlayer, createLobby, removePlayer, setCollection, setGameStatus } = useStore();
    const { broadcast, sendToHost } = usePeer();
    const [copied, setCopied] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const isHost = localPlayer.id === lobby.players.find(p => p.isHost)?.id;

    const handleCopyId = () => {
        if (lobby.hostPeerId) {
            navigator.clipboard.writeText(lobby.hostPeerId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleKick = (playerId: string) => {
        // Only host can kick
        if (!isHost) return;

        // Logic to notify kicked player
        // We need to send a message to that specific peer to disconnect
        // But currently broadcast sends to all. 
        // Optimization: PeerContext needs sendToPeer(peerId, data)
        // For now, broadcast KICK with targetId
        broadcast({ type: 'KICK_PLAYER', targetId: playerId }); // TODO: Handle in PeerContext
        removePlayer(playerId);
    };

    const handleStartGame = () => {
        // Validate collection matches player count?
        // "if the player chooses the 2players collection... he will be able to player with 1 more player"
        // Ideally we check if lobby.players.length matches the collection requirement?
        if (!lobby.selectedCollection) return;
        broadcast({ type: 'GAME_START' });
        setGameStatus('playing');
    };

    const currentCollectionIndex = COLLECTIONS.indexOf(lobby.selectedCollection as CollectionType);

    // Logic to disable collections based on player count?
    // "if there is more then 2 palyers in the lobby the other collections will not be playable for them"
    // Implies: if 3 players, can't play 2player collection? Or maybe can but someone sits out?
    // "if the player chooses the 2players collection... he will be able to player with 1 more player if there is more then 2 palyers in the lobby the other collections will not be playable for them."
    // This phrasing is slightly ambiguous.
    // Interpretation: You can only select collections that support >= current player count?
    // OR: You select a collection, and that defines the max players.
    // Let's assume: Host selects collection.

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4 relative">
            {/* Settings Button in Lobby */}
            <div className="absolute top-4 right-4 z-10">
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 bg-slate-800/50 rounded-lg text-slate-400 hover:text-white transition-colors backdrop-blur-sm border border-slate-700"
                >
                    <SettingsIcon size={20} />
                </button>
            </div>

            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-700">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Lobby
                    </h1>
                    <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-lg">
                        <span className="text-slate-400 text-sm mr-2">Lobby ID:</span>
                        <code className="text-blue-300 font-mono">{lobby.hostPeerId}</code>
                        <button onClick={handleCopyId} className="hover:text-white transition-colors">
                            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Player List */}
                    <div className="bg-slate-700/50 rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Users size={20} /> Players ({lobby.players.length}/10)
                        </h2>
                        <div className="space-y-3">
                            {lobby.players.map((player) => (
                                <div key={player.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-lg border border-slate-600">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold">
                                            {player.name[0].toUpperCase()}
                                        </div>
                                        <span>{player.name} {player.isHost && <span className="text-xs text-yellow-400 ml-1">(Host)</span>}</span>
                                    </div>
                                    {isHost && !player.isHost && (
                                        <button
                                            onClick={() => handleKick(player.id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded-full transition-colors"
                                            title="Kick Player"
                                        >
                                            <LogOut size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Game Settings (Host Only) */}
                    <div className="bg-slate-700/50 rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Play size={20} /> Game Setup
                        </h2>

                        {isHost ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Select Collection</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {COLLECTIONS.map((col) => {
                                            const playerCount = parseInt(col);
                                            const isDisabled = lobby.players.length > playerCount;
                                            return (
                                                <button
                                                    key={col}
                                                    disabled={isDisabled}
                                                    onClick={() => {
                                                        setCollection(col);
                                                        broadcast({ type: 'COLLECTION_SELECTED', collection: col });
                                                    }}
                                                    className={`p-3 rounded-lg border text-sm transition-all ${lobby.selectedCollection === col
                                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                            : isDisabled
                                                                ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                                                                : 'bg-slate-800 border-slate-600 hover:border-slate-500 text-slate-300'
                                                        }`}
                                                >
                                                    {col}
                                                    {isDisabled && <span className="block text-[10px] mt-1 text-red-500/70">Too many players</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-600">
                                    <button
                                        onClick={handleStartGame}
                                        disabled={!lobby.selectedCollection}
                                        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                                    >
                                        Start Game
                                    </button>
                                    <p className="text-xs text-slate-400 text-center mt-2">
                                        Wait for all players to be ready...
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                                <p>Waiting for host to start...</p>
                                {lobby.selectedCollection && (
                                    <p className="text-blue-400">Host selected: <span className="font-bold">{lobby.selectedCollection}</span></p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {showSettings && <GameSettings onClose={() => setShowSettings(false)} />}
        </div>
    );
}
