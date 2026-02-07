#include "SignalingClient.h"
#include <iostream>
#include <nlohmann/json.hpp>
#include <thread>
#include <windows.h>
#include <winhttp.h>

#pragma comment(lib, "winhttp.lib")

using json = nlohmann::json;

SignalingClient::SignalingClient() {}

SignalingClient::~SignalingClient() {
  if (m_ws) {
    m_ws->close();
  }
}

void SignalingClient::Connect(const std::string &gameId,
                              const std::string &playerId) {
  m_gameId = gameId;
  m_playerId = playerId;

  m_ws = std::make_shared<rtc::WebSocket>();

  m_ws->onOpen(
      []() { std::cout << "Signaling WebSocket Connected" << std::endl; });

  m_ws->onError([](std::string s) {
    std::cout << "Signaling WebSocket Error: " << s << std::endl;
  });

  m_ws->onMessage([this](std::variant<rtc::binary, rtc::string> message) {
    if (std::holds_alternative<rtc::string>(message)) {
      std::string msg = std::get<rtc::string>(message);
      // ntfy.sh sends JSON with "event": "message" and "message":
      // "payload_string"
      try {
        auto j = json::parse(msg);
        if (j.contains("event") && j["event"] == "message") {
          std::string payload = j["message"];
          auto p = json::parse(payload);

          if (p.contains("targetId") && p["targetId"] == m_playerId) {
            if (m_onMessage) {
              m_onMessage(p["type"], p["sdp"], p["senderId"]);
            }
          }
        }
      } catch (const std::exception &e) {
        std::cout << "JSON Parse Error: " << e.what() << std::endl;
      }
    }
  });

  std::string url = "wss://ntfy.sh/SyncOrSink_" + gameId + "/ws";
  m_ws->open(url);
}

void SignalingClient::PublishMessage(const std::string &type,
                                     const std::string &sdp,
                                     const std::string &targetId) {
  json j;
  j["type"] = type;
  j["sdp"] = sdp;
  j["senderId"] = m_playerId;
  j["targetId"] = targetId;

  std::string data = j.dump();
  std::string url_path = "/SyncOrSink_" + m_gameId;

  // Run POST in a detached thread to not block
  std::thread([url_path, data]() { HttpPost(url_path, data); }).detach();
}

void SignalingClient::SetOnMessage(
    std::function<void(std::string, std::string, std::string)> callback) {
  m_onMessage = callback;
}

bool SignalingClient::IsConnected() const { return m_ws && m_ws->isOpen(); }

void SignalingClient::HttpPost(const std::string &path,
                               const std::string &data) {
  HINTERNET hSession =
      WinHttpOpen(L"SyncOrSink/1.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
                  WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);

  if (hSession) {
    HINTERNET hConnect =
        WinHttpConnect(hSession, L"ntfy.sh", INTERNET_DEFAULT_HTTPS_PORT, 0);

    if (hConnect) {

      // Convert path to wstring
      std::wstring wpath(path.begin(), path.end());

      HINTERNET hRequest = WinHttpOpenRequest(
          hConnect, L"POST", wpath.c_str(), NULL, WINHTTP_NO_REFERER,
          WINHTTP_DEFAULT_ACCEPT_TYPES, WINHTTP_FLAG_SECURE);

      if (hRequest) {
        std::wstring headers = L"Content-Type: text/plain\r\nTitle: GameSignal";
        // ntfy interprets body as message.

        BOOL bResults = WinHttpSendRequest(
            hRequest, headers.c_str(), headers.length(), (LPVOID)data.c_str(),
            data.length(), data.length(), 0);

        if (bResults) {
          WinHttpReceiveResponse(hRequest, NULL);
        } else {
          std::cout << "WinHttpSendRequest failed: " << GetLastError()
                    << std::endl;
        }
        WinHttpCloseHandle(hRequest);
      }
      WinHttpCloseHandle(hConnect);
    }
    WinHttpCloseHandle(hSession);
  }
}
