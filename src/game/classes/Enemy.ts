import { Enemy as EnemyType } from '@/store/store';
import { assetLoader } from '../systems/AssetLoader';

export class Enemy {
    private prevPos: { x: number, y: number, dir: string };

    constructor(private data: EnemyType) {
        this.prevPos = { x: data.position.x, y: data.position.y, dir: 'Down' };
    }

    get id() { return this.data.id; }
    get position() { return this.data.position; }
    get type() { return this.data.type; }
    get state() { return this.data.state; }

    updateData(data: EnemyType) {
        // Calculate direction before updating data
        const dx = data.position.x - this.data.position.x;
        const dy = data.position.y - this.data.position.y;

        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            this.prevPos.dir = this.getDirection(dx, dy, this.prevPos.dir);
        }

        this.prevPos.x = this.data.position.x;
        this.prevPos.y = this.data.position.y;
        this.data = data;
    }

    private getDirection(dx: number, dy: number, currentDir: string): string {
        if (Math.abs(dx) > Math.abs(dy)) {
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
        const dir = this.prevPos.dir;

        // Animation Frame
        const frameCount = (type === 'drone') ? 1 : 2;
        const frame = Math.floor(timestamp / 200) % frameCount + 1;

        // Get Image
        let imgKey = `${type}_${dir}_${frame}`;
        let img = assetLoader.getImage(imgKey);

        // Fallback for types that might not have all directions (like Camera)
        if (!img && type === 'camera') {
            img = assetLoader.getImage(`${type}_Left_${frame}`) || assetLoader.getImage(`${type}_Right_${frame}`);
        }

        if (img && assetLoader.isLoaded()) {
            const aspect = img.width / img.height;
            const drawW = size;
            const drawH = size / aspect;

            ctx.save();
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(ex, ey + size / 3, size / 3, size / 6, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.drawImage(img, ex - drawW / 2, ey - drawH / 2, drawW, drawH);
            ctx.restore();
        } else {
            // Fallback to cubes if images not loaded
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
        }

        // Alert Status
        if (this.state === 'chasing' || this.state === 'investigating') {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.strokeRect(ex - size / 2, ey - size / 2, size, size);
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this.state === 'investigating' ? '?' : '!', ex, ey - size / 2 - 10);
        }
    }
}
