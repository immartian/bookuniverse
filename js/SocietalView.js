// SocietalView.js
import { View } from './View.js';
export class SocietalView extends View {
    constructor(baseCanvas, overlayCanvas) {
        super('Societal', baseCanvas, overlayCanvas);
    }

    drawBase() {
        const ctx = this.baseCtx;
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
    }

    drawOverlay() {
        const ctx = this.overlayCtx;
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('Societal View', 50, 50);
    }
}
