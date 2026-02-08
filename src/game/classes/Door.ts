import { Door as DoorType } from '@/store/store';

export class Door {
    constructor(private data: DoorType) { }

    get id() { return this.data.id; }
    get position() { return this.data.position; }

    draw(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
        const dx = this.data.position.x - camX;
        const dy = this.data.position.y - camY;
        const size = 64;

        ctx.fillStyle = '#475569'; // Slate-600
        ctx.fillRect(dx - size / 2, dy - size / 2, size, size);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 4;
        ctx.strokeRect(dx - size / 2, dy - size / 2, size, size);

        // Door handle/decoration
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(dx + 20, dy, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}
