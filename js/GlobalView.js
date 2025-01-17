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

        this.drawTitle(ctx, 'All Books(32,022,03)');
        this.drawMapScale(ctx, 10, this.overlayCanvas.height-20, 100, "5000 📚")

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