#pragma once

#include "SignalingClient.h"
#include "raylib.h" // For Vector2
#include "rtc/rtc.hpp"
#include <functional>
#include <memory>
#include <string>


class NetworkManager {
public:
  NetworkManager();
  ~NetworkManager();

  // Start hosting a game. Returns the generated Game ID.
  std::string StartHost();

  // Join a game using Game ID.
  void Join(const std::string &gameId);

  void SendPosition(Vector2 pos);
  void SetOnPositionReceived(std::function<void(Vector2)> callback);

  bool IsConnected() const;

private:
  void SetupPeerConnection();
  void SetupDataChannel(std::shared_ptr<rtc::DataChannel> dc);
  void OnSignalingMessage(std::string type, std::string sdp,
                          std::string senderId);

  std::shared_ptr<rtc::PeerConnection> m_pc;
  std::shared_ptr<rtc::DataChannel> m_dc;

  std::shared_ptr<SignalingClient> m_signalingClient;
  std::string m_gameId;
  std::string m_playerId;

  std::function<void(Vector2)> m_onPositionReceived;
};
