import { View } from './View.js';
export class BookshelfView extends View {
    constructor(baseCanvas, overlayCanvas) {
        super('Bookshelf', baseCanvas, overlayCanvas);
    }

    drawBase() {
        const ctx = this.baseCtx;
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
    }

    drawOverlay() {
        const ctx = this.overlayCtx;
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('Bookshelf View', 50, 50);
    }
}