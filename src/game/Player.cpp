#include "Player.h"
#include <cmath>

Player::Player(Vector2 startPos, Color color)
    : m_position(startPos), m_color(color), m_speed(200.0f), m_radius(20.0f) {}

void Player::Update(float dt, bool isLocal) {
  if (isLocal) {
    Vector2 movement = {0.0f, 0.0f};

    if (IsKeyDown(KEY_W) || IsKeyDown(KEY_UP))
      movement.y -= 1.0f;
    if (IsKeyDown(KEY_S) || IsKeyDown(KEY_DOWN))
      movement.y += 1.0f;
    if (IsKeyDown(KEY_A) || IsKeyDown(KEY_LEFT))
      movement.x -= 1.0f;
    if (IsKeyDown(KEY_D) || IsKeyDown(KEY_RIGHT))
      movement.x += 1.0f;

    if (movement.x != 0.0f || movement.y != 0.0f) {
      // Normalize
      float len = sqrt(movement.x * movement.x + movement.y * movement.y);
      movement.x /= len;
      movement.y /= len;

      m_position.x += movement.x * m_speed * dt;
      m_position.y += movement.y * m_speed * dt;
    }
  }
}

void Player::Draw() {
  DrawRectangle((int)(m_position.x - m_radius), (int)(m_position.y - m_radius),
                (int)(m_radius * 2), (int)(m_radius * 2), m_color);
  DrawRectangleLines((int)(m_position.x - m_radius),
                     (int)(m_position.y - m_radius), (int)(m_radius * 2),
                     (int)(m_radius * 2), BLACK);
}
