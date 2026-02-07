#include "NetworkManager.h"
#include <chrono>
#include <cstring>
#include <iostream>
#include <random>
#include <thread>

using namespace std::chrono_literals;

// Helper to generate random ID
std::string GenerateId(int length) {
  static const char alphanum[] = "0123456789";
  std::string s;
  s.resize(length);
  for (int i = 0; i < length; ++i) {
    s[i] = alphanum[rand() % (sizeof(alphanum) - 1)];
  }
  return s;
}

NetworkManager::NetworkManager() {
  srand(time(0));
  m_playerId = GenerateId(6); // Random Player ID
  m_signalingClient = std::make_shared<SignalingClient>();

  m_signalingClient->SetOnMessage(
      [this](std::string type, std::string sdp, std::string senderId) {
        OnSignalingMessage(type, sdp, senderId);
      });
}

NetworkManager::~NetworkManager() {
  if (m_dc)
    m_dc->close();
  if (m_pc)
    m_pc->close();
}

void NetworkManager::SetupPeerConnection() {
  rtc::Configuration config;
  config.iceServers.emplace_back("stun:stun.l.google.com:19302"); // Public STUN

  m_pc = std::make_shared<rtc::PeerConnection>(config);

  m_pc->onLocalDescription([this](rtc::Description description) {
    // In this automated flow, we might send description immediately if we know
    // the target. But usually we wait for gathering complete or send individual
    // candidates. For simplicity, we wait for gathering complete (handled in
    // onGatheringStateChange) or we can send the description as soon as it's
    // ready if we don't care about bundling candidates. Let's rely on gathering
    // complete for the full SDP.
  });

  m_pc->onLocalCandidate([this](rtc::Candidate candidate) {
    // Send candidate? For MVP we bundle everything in SDP by waiting for
    // gathering complete.
  });

  m_pc->onStateChange([](rtc::PeerConnection::State state) {
    std::cout << "State: " << state << std::endl;
  });

  m_pc->onGatheringStateChange(
      [this](rtc::PeerConnection::GatheringState state) {
        std::cout << "Gathering State: " << state << std::endl;
        if (state == rtc::PeerConnection::GatheringState::Complete) {
          auto desc = m_pc->localDescription();
          if (desc) {
            std::string sdp = std::string(*desc);
            std::string type = (desc->type() == rtc::Description::Type::Offer)
                                   ? "offer"
                                   : "answer";

            // Broadcast to "other" (we don't know the target ID yet if we are
            // Host offering, but actually Host waits for Client? No, standard
            // WebRTC: Host Creates Offer -> Sends to Client. Wait, if Host
            // connects to WS, it doesn't know Client ID yet. So Host should
            // wait for a "Join" request? OR: Host just sits there. Client
            // connects, sends "Hello"?

            // REVISED FLOW matching ntfy.sh:
            // 1. Host Connects WS.
            // 2. Client Connects WS.
            // 3. Client Sends "ReadyToJoin"? OR Client Sends OFFER?
            // Let's have CLIENT send OFFER. It's easier for P2P if Client
            // initiates connection to Host. So: Client -> StartHost (Wait) Host
            // -> Join (Connect) -> Send Offer ?? No. "Host" usually means
            // "Server". "Client" joins "Server". So Client (Joiner) should send
            // Offer to Host (Creator).

            // If I am Host (Creator): I wait for Offer.
            // If I am Client (Joiner): I Create Offer and Send it.

            // Let's look at StartHost vs Join implementation below.
            if (type == "offer") {
              // I am Client (Joiner), I send Offer to Host.
              // Host ID? We use GameID as topic.
              // We publish to the topic. Host will receive it.
              // TargetID? Just broadcast, Host ignores if not meant for him
              // (but he is the only listener usually)
              m_signalingClient->PublishMessage("offer", sdp, "host");
            } else {
              // I am Host, I send Answer to the sender of the Offer.
              // We need to know who sent the offer.
              // See OnSignalingMessage.
            }
          }
        }
      });

  m_pc->onDataChannel(
      [this](std::shared_ptr<rtc::DataChannel> dc) { SetupDataChannel(dc); });
}

void NetworkManager::SetupDataChannel(std::shared_ptr<rtc::DataChannel> dc) {
  m_dc = dc;
  m_dc->onOpen([]() { std::cout << "DataChannel Open" << std::endl; });
  m_dc->onMessage([this](std::variant<rtc::binary, rtc::string> message) {
    if (std::holds_alternative<rtc::binary>(message)) {
      auto &data = std::get<rtc::binary>(message);
      if (data.size() == sizeof(Vector2)) {
        Vector2 pos;
        std::memcpy(&pos, data.data(), sizeof(Vector2));
        if (m_onPositionReceived)
          m_onPositionReceived(pos);
      }
    }
  });
}

std::string NetworkManager::StartHost() {
  m_gameId = GenerateId(4); // 4 digit ID
  std::cout << "Hosting Game ID: " << m_gameId << std::endl;

  // Host listens on WS.
  m_signalingClient->Connect(m_gameId, "host");

  // Setup PC but don't create offer. Wait for Client's Offer.
  SetupPeerConnection();

  return m_gameId;
}

void NetworkManager::Join(const std::string &gameId) {
  m_gameId = gameId;
  m_signalingClient->Connect(m_gameId, m_playerId);

  SetupPeerConnection();

  // Client initiates connection: Create Data Channel + Offer
  auto dc = m_pc->createDataChannel("game");
  SetupDataChannel(dc);

  // This triggers gathering, validation, and eventually onGatheringStateChange
  // -> Complete -> Send Offer
}

void NetworkManager::OnSignalingMessage(std::string type, std::string sdp,
                                        std::string senderId) {
  std::cout << "Received Signal: " << type << " from " << senderId << std::endl;

  if (type == "offer") {
    // I am Host. Received Offer from Client.
    // Set Remote Desc
    m_pc->setRemoteDescription(rtc::Description(sdp, type));

    // PeerConnection will automatically generate Answer? No, we must ask for
    // it? Actually libdatachannel might need explicit answer creation? Yes. But
    // gathering is already done? No. We set ID of sender to target the answer.
    // Wait, m_pc callbacks need to know "senderId" to reply.
    // We can capture it in a lambda? No, this is OnMessage.

    // Hack: Store the last sender ID to reply to.
    // Or better: Just Reply here? No, Answer must be generated async.
    m_pc->onGatheringStateChange(
        [this, senderId](rtc::PeerConnection::GatheringState state) {
          if (state == rtc::PeerConnection::GatheringState::Complete) {
            auto desc = m_pc->localDescription();
            if (desc && desc->type() == rtc::Description::Type::Answer) {
              std::string sdp = std::string(*desc);
              m_signalingClient->PublishMessage("answer", sdp, senderId);
            }
          }
        });

  } else if (type == "answer") {
    // I am Client. Received Answer from Host.
    m_pc->setRemoteDescription(rtc::Description(sdp, type));
  }
}

void NetworkManager::SendPosition(Vector2 pos) {
  if (m_dc && m_dc->isOpen()) {
    std::byte data[sizeof(Vector2)];
    std::memcpy(data, &pos, sizeof(Vector2));
    m_dc->send(data, sizeof(Vector2));
  }
}

void NetworkManager::SetOnPositionReceived(
    std::function<void(Vector2)> callback) {
  m_onPositionReceived = callback;
}

bool NetworkManager::IsConnected() const { return m_dc && m_dc->isOpen(); }
