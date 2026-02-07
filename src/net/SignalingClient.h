#pragma once

#include "rtc/rtc.hpp"
#include <functional>
#include <memory>
#include <string>

class SignalingClient {
public:
  SignalingClient();
  ~SignalingClient();

  // Connect to ntfy.sh topic via WebSocket (listen)
  void Connect(const std::string &gameId, const std::string &playerId);

  // Publish message to ntfy.sh topic via HTTP POST
  void PublishMessage(const std::string &type, const std::string &sdp,
                      const std::string &targetId);

  void SetOnMessage(std::function<void(std::string type, std::string sdp,
                                       std::string senderId)>
                        callback);
  bool IsConnected() const;

private:
  std::string m_gameId;
  std::string m_playerId;
  std::shared_ptr<rtc::WebSocket> m_ws;
  std::function<void(std::string type, std::string sdp, std::string senderId)>
      m_onMessage;

  // Helper to send HTTP POST using WinHttp
  static void HttpPost(const std::string &url, const std::string &data);
};
