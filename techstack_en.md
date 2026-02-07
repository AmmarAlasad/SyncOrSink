# Technical Stack for a 2D WebRTC Co-op Game (Picko Park–like Concept)

## 1. Project Goals

This project aims to build a **fun, cooperative 2D multiplayer game** inspired by the *concept* of Picko Park (not a clone).  
The main focus is **playing together with friends**, simplicity, and fast iteration.

### Core Requirements
- 2D game (Windows only)
- Peer-to-peer multiplayer (host-to-host) using WebRTC
- Simple, friendly UI
- Easy level creation (even for non-programmers)
- Downloadable from GitHub (no store dependency)
- Updates without reinstalling the whole game
- Fun-first design

---

## 2. High-Level Architecture Overview

```
+-------------------+
|   Game Client     |
|  (Windows, C++)   |
|                   |
|  - Rendering      |
|  - Game Logic     |
|  - UI             |
|  - WebRTC P2P     |
+---------+---------+
          |
          | WebRTC DataChannels
          |
+---------+---------+
|   Game Client     |
|   (Friend PC)     |
+-------------------+

(Signaling via lightweight server or direct invite code)
```

There is **no central game server** for gameplay.  
Only a **small signaling step** is required to establish the WebRTC connection.

---

## 3. Programming Language & Build System

### Language
- **C++17**
  - Fast
  - Mature ecosystem
  - Full control over networking and performance

### Build System
- **CMake**
  - Industry standard for C++
  - Works perfectly with GitHub Actions
  - Easy dependency management

---

## 4. 2D Rendering & Game Framework

### raylib (Core Game Framework)
**Why raylib:**
- Designed specifically for games
- Very easy API
- Excellent 2D performance
- Minimal dependencies
- Perfect for indie & fun-focused games

**Used for:**
- Window & input handling
- 2D rendering (sprites, animations)
- Audio (sound effects, music)
- Game loop & timing

raylib keeps the project **simple and hackable**, which fits a Picko‑Park‑style game perfectly.

---

## 5. User Interface (UI)

### raygui (In‑Game UI)
- Immediate-mode GUI built for raylib
- Ideal for:
  - Main menu
  - Lobby screen
  - Settings
  - Simple HUD

**Why not Qt for the game UI?**
- Qt is powerful but heavy
- raygui integrates directly into the game loop
- Much easier to style for a game look

### Dear ImGui (Optional – Developer Tools)
Used only for:
- Debug menus
- Network diagnostics
- Level debugging
- Developer-only tools

Not shown to players in release builds.

---

## 6. Multiplayer & Networking

### WebRTC with libdatachannel

**Library:** `libdatachannel`

**Why WebRTC:**
- True peer-to-peer (low latency)
- NAT traversal (works for most home networks)
- No dedicated game server required
- Same technology as PeerJS

**Why libdatachannel:**
- C++ friendly
- Much smaller than Google’s full WebRTC stack
- Easy to integrate with CMake
- Perfect for data-only multiplayer games

**Used for:**
- Player movement sync
- Button presses
- Game state synchronization
- Lobby & ready states

### Networking Model
- One player hosts
- Other players join
- Host is authoritative for game logic
- Deterministic logic to keep all clients in sync

---

## 7. Signaling (Connection Setup)

WebRTC still needs signaling to exchange:
- SDP offers/answers
- ICE candidates

### Simple Signaling Options
- Lightweight WebSocket server (Node.js or C++)
- Invite code system
- Manual copy-paste (for early prototypes)

**Important:**  
Signaling is **not gameplay**.  
Once connected, the game runs **purely peer-to-peer**.

---

## 8. Level Creation (Very Important)

### Tiled Map Editor

**Why Tiled:**
- Free & open source
- Visual editor (no coding)
- Extremely popular in 2D games
- Exports to JSON
- Easy for players & modders

**Level Structure:**
- Tile layers → ground, walls
- Object layers → players, buttons, doors, goals
- Custom properties → gameplay logic

**Workflow:**
1. Create level in Tiled
2. Export as JSON
3. Place file in `assets/levels/`
4. Game loads it automatically

➡️ Adding a new level = **just adding a file**  
➡️ No recompiling required

This makes user-generated levels and updates trivial.

---

## 9. Asset Management

```
assets/
 ├── textures/
 ├── sounds/
 ├── music/
 ├── levels/
 │   ├── level_01.json
 │   ├── level_02.json
 │   └── bonus_fun.json
 └── ui/
```

Assets are loaded at runtime, not compiled into the executable.

---

## 10. Distribution & Updates

### GitHub Releases

**How players get the game:**
- Download from GitHub Releases
- No installer required
- Portable ZIP

### Auto-Update Strategy

#### Recommended Approach
- Small **Launcher/Updater** (C++ or Qt)
- Launcher checks latest GitHub Release
- Downloads new version if available
- Extracts files over existing install

**Result:**
- Players never reinstall
- One click to update
- Very indie-friendly

Optional advanced option:
- Squirrel.Windows for delta updates (later stage)

---

## 11. Folder Structure (Repository)

```
game-project/
 ├── CMakeLists.txt
 ├── src/
 │   ├── main.cpp
 │   ├── game/
 │   ├── net/
 │   └── ui/
 ├── external/
 │   ├── raylib/
 │   └── libdatachannel/
 ├── assets/
 ├── launcher/
 └── .github/workflows/
```

---

## 12. Why This Stack Works for This Game

| Requirement | Solution |
|------------|----------|
| Fun co-op | Simple 2D logic |
| Easy multiplayer | WebRTC P2P |
| No servers | Host-to-host |
| Easy levels | Tiled |
| Simple UI | raylib + raygui |
| Easy updates | GitHub Releases |
| Windows-only | Less complexity |

---

## 13. Final Summary

This tech stack is:
- **Simple**
- **Modern**
- **Indie-proven**
- **Player-friendly**
- **Mod-friendly**
- **Future-proof enough without being over-engineered**

It is perfectly suited for a **Picko‑Park‑style cooperative game** whose main goal is:
> *having fun with friends, not fighting technology.*
