# SyncOrSink

A 2D cooperative multiplayer game built with C++ and WebRTC.

## 🚀 Current Status (MVP)
The game is currently in a **Minimum Viable Product** state.
- **Networking**: Peer-to-Peer connection established via Game ID.
- **Signaling**: Uses `ntfy.sh` as a public relay (Serverless!).
- **Gameplay**: Basic movement synchronization (WASD).
- **Platform**: Windows.

## 🛠️ Build Instructions
To build the project from source, you need **CMake** and a **C++17 compiler** (visual Studio recommended).

1.  **Clone the repository**:
    ```powershell
    git clone https://github.com/AmmarAlasad/SyncOrSink.git
    cd SyncOrSink
    ```

2.  **Generate Build Files**:
    ```powershell
    cmake -B build
    ```
    *Note: This will automatically download dependencies (raylib, libdatachannel, json).*

3.  **Compile**:
    ```powershell
    cmake --build build
    ```

4.  **Run**:
    The executable is located in `build/bin/`.
    ```powershell
    .\build\bin\SyncOrSink.exe
    ```

## 🎮 How to Play
You can play over the local network or the Internet!

**Host:**
1.  Run the game.
2.  Press **'H'** to Host.
3.  Note the **4-digit Game ID** (e.g., `1234`).
4.  Share it with your friend.

**Join:**
1.  Run the game.
2.  Press **'J'** to Join.
3.  Type the **Game ID** and press **ENTER**.
4.  Wait for the connection message.

**Controls:**
- **WASD / Arrow Keys**: Move.

## 🔮 Future Roadmap
- [ ] **Installer**: Easy-to-use installer for non-developers.
- [ ] **Game Mechanics**: Cooperative puzzles, physics interactions.
- [ ] **Visuals**: Animated sprites, particle effects, polished UI.
- [ ] **Lobby System**: Detailed lobby with ready check.
- [ ] **Audio**: Sound effects and background music.
