import { Player as PlayerType } from '@/store/store';

export class Player {
    constructor(private data: PlayerType) { }

    get id() { return this.data.id; }
    get position() { return this.data.position; }
    get isFrozen() { return this.data.isFrozen; }
    get name() { return this.data.name; }
    get color() { return this.data.color; }
    get isHost() { return this.data.isHost; }

    updatePosition(x: number, y: number) {
        if (!this.data.position) this.data.position = { x, y };
        this.data.position.x = x;
        this.data.position.y = y;
    }

    draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, mousePos: { x: number, y: number }, isMe: boolean) {
        if (!this.data.position) return;

        const x = this.data.position.x - camX;
        const y = this.data.position.y - camY;
        const size = 64;

        // Player Body
        ctx.fillStyle = this.data.color;
        ctx.beginPath();
        ctx.roundRect(x - size / 2, y - size / 2, size, size, 8);
        ctx.fill();

        // Shiny Effect
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.roundRect(x - size / 2, y - size / 2, size, size / 3, [8, 8, 0, 0]);
        ctx.fill();

        // Outline
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x - size / 2 + 4, y - size / 2 + 4, size, size);

        // Name Tag (on hover)
        const isHovered = Math.abs(mousePos.x - x) < size / 2 && Math.abs(mousePos.y - y) < size / 2;
        if (isHovered) {
            const nameY = y - 45;
            ctx.font = 'bold 16px sans-serif';
            const nameWidth = ctx.measureText(this.data.name).width;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.beginPath();
            ctx.roundRect(x - (nameWidth + 20) / 2, nameY - 20, nameWidth + 20, 25, 6);
            ctx.fill();
            ctx.fillStyle = '#f8fafc';
            ctx.textAlign = 'center';
            ctx.fillText(this.data.name, x, nameY);
            if (isMe || this.data.isHost) {
                ctx.font = 'bold 10px sans-serif';
                ctx.fillStyle = isMe ? '#818cf8' : '#f59e0b';
                ctx.fillText(isMe ? 'YOU' : 'HOST', x, nameY - 22);
            }
        }

        // Frozen Effect
        if (this.data.isFrozen) {
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.roundRect(x - size / 2 - 5, y - size / 2 - 5, size + 10, size + 10, 8);
            ctx.stroke();
            ctx.fillStyle = '#f43f5e';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('FROZEN', x, y + size / 2 + 20);
        }
    }
}
