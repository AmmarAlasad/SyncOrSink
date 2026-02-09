import { Enemy as EnemyType } from '@/store/store';
import { assetLoader } from '../systems/AssetLoader';

export class Enemy {
    private prevPos: { x: number, y: number, dir: string };
    private lastX: number;
    private lastY: number;

    constructor(private data: EnemyType) {
        this.lastX = data.position.x;
        this.lastY = data.position.y;
        this.prevPos = { x: data.position.x, y: data.position.y, dir: 'Down' };
    }

    get id() { return this.data.id; }
    get position() { return this.data.position; }
    get type() { return this.data.type; }
    get state() { return this.data.state; }
    get direction() { return this.data.direction || this.prevPos.dir; }

    updateData(data: EnemyType) {
        // Calculate direction using tracked last position to avoid reference mutation issues
        const dx = data.position.x - this.lastX;
        const dy = data.position.y - this.lastY;

        // Use a smaller epsilon to catch even slow patrol movements
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
            this.prevPos.dir = this.getDirection(dx, dy);
        }

        this.lastX = data.position.x;
        this.lastY = data.position.y;
        this.data = data;
    }

    private getDirection(dx: number, dy: number): string {
        // Tie-break with small bias to prevent jittering on perfectly diagonal movement
        if (Math.abs(dx) >= Math.abs(dy)) {
            return dx > 0 ? 'Right' : 'Left';
        } else {
            return dy > 0 ? 'Down' : 'Up';
        }
    }

    draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, timestamp: number) {
        const ex = this.data.position.x - camX;
        const ey = this.data.position.y - camY;
        const type = this.data.type;
        const size = type === 'dog' ? 48 : 64;
        const dir = this.direction;

        // Animation Frame - 2 frames for most, 1 for drone
        const frameCount = (type === 'drone') ? 1 : 2;
        const frame = Math.floor(timestamp / 300) % frameCount + 1; // Slightly slower animation for better readability

        // Get Image with explicit keys matching AssetLoader
        let imgKey = `${type}_${dir}_${frame}`;
        let img = assetLoader.getImage(imgKey);

        // Fallback for missing directional assets
        if (!img) {
            // Try frame 1 if frame 2 is missing
            img = assetLoader.getImage(`${type}_${dir}_1`);
            // Try Down direction if current direction is missing
            if (!img) img = assetLoader.getImage(`${type}_Down_1`);
        }

        const isAlerted = this.state === 'chasing' || this.state === 'investigating';
        const isDangerous = this.state === 'chasing' && (this.type === 'guard' || this.type === 'dog');
        const alertColor = isDangerous ? '#ef4444' : '#f59e0b'; // Red for deadly chase, Amber for drones/cameras

        // Check if image is loaded and valid before drawing
        if (img && assetLoader.isLoaded() && img.complete && img.naturalWidth > 0) {
            const aspect = img.width / img.height;
            const drawW = size;
            const drawH = size / aspect;

            ctx.save();
            // Shadow (drawn first)
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(ex, ey + size / 3, size / 3, size / 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Highlight/Glow around PNG shape
            if (isAlerted) {
                ctx.filter = `drop-shadow(0 0 2px ${alertColor}) drop-shadow(0 0 3px ${alertColor})`;
            }

            ctx.drawImage(img, ex - drawW / 2, ey - drawH / 2, drawW, drawH);
            ctx.restore();
        } else {
            // Fallback to cubes if images not loaded
            ctx.save();
            if (isAlerted) {
                ctx.filter = `drop-shadow(0 0 5px ${alertColor})`;
            }

            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(ex - size / 2 + 4, ey - size / 2 + 4, size, size);

            if (type === 'drone') {
                ctx.fillStyle = '#eab308';
                ctx.beginPath();
                ctx.moveTo(ex, ey - size / 2);
                ctx.lineTo(ex + size / 2, ey);
                ctx.lineTo(ex, ey + size / 2);
                ctx.lineTo(ex - size / 2, ey);
                ctx.closePath();
                ctx.fill();
                // Propellers visual
                ctx.strokeStyle = '#713f12';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(ex - size / 2, ey - size / 2); ctx.lineTo(ex + size / 2, ey + size / 2);
                ctx.moveTo(ex + size / 2, ey - size / 2); ctx.lineTo(ex - size / 2, ey + size / 2);
                ctx.stroke();
            } else if (type === 'camera') {
                ctx.fillStyle = '#78350f';
                ctx.beginPath();
                ctx.roundRect(ex - size / 2, ey - size / 2, size, size, 4);
                ctx.fill();
                // Lens
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.arc(ex, ey, size / 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                ctx.fillStyle = type === 'dog' ? '#000000' : '#94a3b8';
                ctx.beginPath();
                ctx.roundRect(ex - size / 2, ey - size / 2, size, size, 4);
                ctx.fill();
            }
            ctx.restore();
        }

        // Alert Status Indicator Text
        if (isAlerted) {
            ctx.save();
            ctx.fillStyle = alertColor;
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.fillText(this.state === 'investigating' ? '?' : '!', ex, ey - size / 2 - 15);
            ctx.restore();
        }
    }
}
