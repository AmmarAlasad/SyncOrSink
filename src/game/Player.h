#pragma once

#include "raylib.h"

class Player {
public:
    Player(Vector2 startPos, Color color);
    ~Player() = default;

    void Update(float dt, bool isLocal);
    void Draw();

    Vector2 GetPosition() const { return m_position; }
    void SetPosition(Vector2 pos) { m_position = pos; }

private:
    Vector2 m_position;
    Color m_color;
    float m_speed;
    float m_radius; // Using a slightly rounded rect or just size
};
