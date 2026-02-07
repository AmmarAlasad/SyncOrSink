#pragma once

#include "raylib.h"
#include <memory>
#include <string>
#include <vector>

// Forward declarations
class Player;
class NetworkManager;

class Game {
public:
  Game();
  ~Game();

  void Init();
  void Run();

  void Update();
  void Draw();
  void UpdateMenu();
  void DrawMenu();
  void UpdateGame();
  void DrawGame();

  enum class State { MENU, HOSTING, JOINING, PLAYING };

  State m_state;
  bool m_isRunning;

  // Networking UI helpers
  std::string m_statusMessage;
  std::string m_gameId;        // Hosted ID or Joined ID
  char m_inputBuffer[6] = {0}; // 4 chars + null
  int m_inputCount = 0;

  std::unique_ptr<Player> m_localPlayer;
  std::unique_ptr<Player> m_remotePlayer;
  std::unique_ptr<NetworkManager> m_networkManager;
};
