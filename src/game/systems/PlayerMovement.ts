import { GameConfig } from '../core/GameConfig';
import type { InputHandler } from '../systems/InputHandler';

export interface MovementResult {
    x: number;
    y: number;
    moved: boolean;
}

/**
 * PlayerMovement - Handles local player movement logic
 * Extracted from GameCanvas.tsx lines 136-165
 */
export class PlayerMovement {
    /**
     * Update player position based on input
     * @param currentPos Current player position
     * @param input Input handler
     * @param keybinds Key bindings from settings
     * @param deltaTime Time since last update
     * @param isFrozen Whether player is frozen
     * @param isGameOver Whether game is over
     * @returns Updated position and movement flag
     */
    static update(
        currentPos: { x: number, y: number },
        input: InputHandler,
        keybinds: Record<string, string>,
        deltaTime: number,
        isFrozen: boolean,
        isGameOver: boolean
    ): MovementResult {
        if (isFrozen || isGameOver) {
            return { ...currentPos, moved: false };
        }

        const speed = GameConfig.PLAYER_BASE_SPEED * deltaTime;
        let x = currentPos.x;
        let y = currentPos.y;
        let moved = false;

        // Check movement keys
        if (input.isKeyPressed(keybinds.up) || input.isKeyPressed('KeyW')) {
            y -= speed;
            moved = true;
        }
        if (input.isKeyPressed(keybinds.down) || input.isKeyPressed('KeyS')) {
            y += speed;
            moved = true;
        }
        if (input.isKeyPressed(keybinds.left) || input.isKeyPressed('KeyA')) {
            x -= speed;
            moved = true;
        }
        if (input.isKeyPressed(keybinds.right) || input.isKeyPressed('KeyD')) {
            x += speed;
            moved = true;
        }

        // Clamp to world boundaries
        const clamped = GameConfig.clampToWorld(x, y);

        return {
            x: clamped.x,
            y: clamped.y,
            moved
        };
    }
}
