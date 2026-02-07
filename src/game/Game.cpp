#include "Game.h"
#include "../net/NetworkManager.h"
#include "Player.h"
#include <iostream>

Game::Game() : m_state(State::MENU), m_isRunning(true), m_inputCount(0) {
  m_inputBuffer[0] = '\0';
}

Game::~Game() { CloseWindow(); }

void Game::Init() {
  InitWindow(800, 600, "SyncOrSink - MVP");
  SetTargetFPS(60);

  m_networkManager = std::make_unique<NetworkManager>();

  // Initial positions
  m_localPlayer = std::make_unique<Player>((Vector2){200, 300}, BLUE);
  m_remotePlayer = std::make_unique<Player>((Vector2){600, 300}, RED);

  // Network callbacks
  m_networkManager->SetOnPositionReceived([this](Vector2 pos) {
    if (m_remotePlayer) {
      m_remotePlayer->SetPosition(pos);
    }
  });
}

void Game::Run() {
  while (!WindowShouldClose() && m_isRunning) {
    Update();
    Draw();
  }
}

void Game::Update() {
  switch (m_state) {
  case State::MENU:
    UpdateMenu();
    break;
  case State::HOSTING:
    // Just waiting for connection
    if (m_networkManager->IsConnected()) {
      m_state = State::PLAYING;
      m_statusMessage = "Connected!";
    }
    break;
  case State::JOINING:
    // Handle Input
    {
      int key = GetCharPressed();
      while (key > 0) {
        if ((key >= 32) && (key <= 125) && (m_inputCount < 4)) {
          m_inputBuffer[m_inputCount] = (char)key;
          m_inputBuffer[m_inputCount + 1] = '\0';
          m_inputCount++;
        }
        key = GetCharPressed();
      }

      if (IsKeyPressed(KEY_BACKSPACE)) {
        m_inputCount--;
        if (m_inputCount < 0)
          m_inputCount = 0;
        m_inputBuffer[m_inputCount] = '\0';
      }

      if (IsKeyPressed(KEY_ENTER) && m_inputCount > 0) {
        m_statusMessage = "Joining Game: " + std::string(m_inputBuffer) + "...";
        m_networkManager->Join(std::string(m_inputBuffer));
      }
    }

    if (m_networkManager->IsConnected()) {
      m_state = State::PLAYING;
      m_statusMessage = "Connected!";
    }
    break;
  case State::PLAYING:
    UpdateGame();
    break;
  }
}

void Game::UpdateMenu() {
  if (IsKeyPressed(KEY_H)) {
    m_state = State::HOSTING;
    m_gameId = m_networkManager->StartHost();
    m_statusMessage = "Game ID: " + m_gameId + "\nWaiting for player...";
  }

  if (IsKeyPressed(KEY_J)) {
    m_state = State::JOINING;
    m_statusMessage = "Enter Game ID (4 chars):";
    m_inputCount = 0;
    m_inputBuffer[0] = '\0';
  }
}

void Game::UpdateGame() {
  float dt = GetFrameTime();

  m_localPlayer->Update(dt, true);
  // Remote player updated via network callback

  // Send local position
  m_networkManager->SendPosition(m_localPlayer->GetPosition());
}

void Game::Draw() {
  BeginDrawing();
  ClearBackground(RAYWHITE);

  switch (m_state) {
  case State::MENU:
    DrawMenu();
    break;
  case State::HOSTING:
    DrawText("HOSTING GAME", 300, 50, 20, BLACK);
    DrawText(m_statusMessage.c_str(), 100, 150, 30, DARKBLUE);
    break;
  case State::JOINING:
    DrawText("JOIN GAME", 350, 50, 20, BLACK);
    DrawText("Enter Game ID:", 300, 150, 20, DARKGRAY);

    DrawRectangle(300, 180, 200, 40, LIGHTGRAY);
    DrawText(m_inputBuffer, 310, 190, 30, BLACK);

    DrawText("Press ENTER to Join", 300, 250, 20, DARKGRAY);

    DrawText(m_statusMessage.c_str(), 100, 350, 20, MAROON);
    break;
  case State::PLAYING:
    DrawGame();
    break;
  }

  EndDrawing();
}

void Game::DrawMenu() {
  DrawText("SyncOrSink - MVP", 300, 100, 30, BLACK);
  DrawText("Press 'H' to Host", 300, 200, 20, DARKGRAY);
  DrawText("Press 'J' to Join", 300, 250, 20, DARKGRAY);
  DrawText("Powered by ntfy.sh", 10, 580, 10, LIGHTGRAY);
}

void Game::DrawGame() {
  m_localPlayer->Draw();
  m_remotePlayer->Draw();

  DrawFPS(10, 10);
  DrawText("Connected!", 350, 20, 20, GREEN);
}
