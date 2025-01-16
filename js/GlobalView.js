import { View } from './View.js';
export class GlobalView extends View {
    constructor(baseCanvas, overlayCanvas, tooltip) {
        super('Global', baseCanvas, overlayCanvas);
        this.tooltip = tooltip;
        this.image = new Image();
        this.image.src = 'images/global_view.png'; // Replace with the actual path to your image
        this.image.onload = () => {
            this.drawBase();
        };
    }

    drawBase() {
        const ctx = this.baseCtx;
        ctx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
        ctx.drawImage(this.image, 0, 0, this.baseCanvas.width, this.baseCanvas.height);
    }

    drawOverlay() {
        const ctx = this.overlayCtx;
        ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('Global books(1:50)', 50, 50);
    }

    handleHover({ x, y }) {
        const region = this.getRegionFromCoordinates(x, y);
        if (region) {
            this.tooltip.show(`Region: ${region}`, x, y);
        } else {
            this.tooltip.hide();
        }
    }

    getRegionFromCoordinates(x, y) {
        // Placeholder logic for detecting regions. Replace with real logic.
        if (x > 200 && x < 400 && y > 300 && y < 500) {
            return 'Sample Region';
        }
        return null;
    }
}