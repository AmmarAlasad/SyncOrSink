'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/store';
import { usePeer } from '@/context/PeerContext';
import Lobby from '@/components/Lobby';
import GameCanvas from '@/components/GameCanvas';
import GameSettings from '@/components/GameSettings';
import { Play, Users, Settings as SettingsIcon } from 'lucide-react';

export default function Home() {
  const { lobby, localPlayer, createLobby, setPlayerName, joinLobby, resetLobby } = useStore();
  const { connectToHost } = usePeer();
  const [joinId, setJoinId] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleCreateLobby = () => {
    if (localPlayer.peerId) {
      createLobby(localPlayer.peerId);
    }
  };

  const handleJoinLobby = () => {
    if (joinId && localPlayer.peerId) {
      // Join logic:
      // 1. Peer connect to host
      // 2. Send JOIN request
      connectToHost(joinId, localPlayer);
      joinLobby(joinId, joinId); // Optimistically set lobby id
    }
  };

  // Render Logic
  if (!isClient) return null; // Prevent hydration mismatch

  // If in game
  if (lobby.status === 'playing') {
    return <GameCanvas />;
  }

  // If in lobby
  if (lobby.status === 'lobby') {
    return <Lobby />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 font-sans text-white overflow-hidden relative">

      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="z-10 w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-6xl font-black bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tighter">
            Sync<span className="text-white">Or</span>Sink
          </h1>
          <p className="text-slate-400 text-lg">Collaborate or drown together.</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md p-8 rounded-2xl border border-slate-800 shadow-xl space-y-6">

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-400">Your Name</label>
            <input
              type="text"
              value={localPlayer.name}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-slate-800 border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              placeholder="Enter nickname"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 pt-4">
            <button
              onClick={handleCreateLobby}
              disabled={!localPlayer.peerId}
              className="group relative flex items-center justify-center gap-3 w-full p-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-bold text-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="group-hover:translate-x-1 transition-transform" fill="currentColor" />
              Create Lobby
            </button>

            <div className="relative flex items-center gap-2">
              <div className="h-px bg-slate-800 flex-1"></div>
              <span className="text-slate-600 text-xs uppercase font-bold">OR</span>
              <div className="h-px bg-slate-800 flex-1"></div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Enter Lobby ID"
                className="flex-1 bg-slate-800 border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-mono text-sm"
              />
              <button
                onClick={handleJoinLobby}
                className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg transition-colors font-bold shadow-lg shadow-blue-500/20"
              >
                Join
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => setShowSettings(true)}
            className="text-slate-400 hover:text-indigo-400 flex items-center gap-2 text-sm transition-colors bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800 hover:border-indigo-600/50"
          >
            <SettingsIcon size={16} /> Game Settings
          </button>
        </div>
      </div>

      {showSettings && <GameSettings onClose={() => setShowSettings(false)} />}
    </main>
  );
}
