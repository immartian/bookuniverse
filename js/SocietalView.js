import { View } from './View.js';
import { TileManager } from './TileManager.js';

export class SocietalView extends View {
    constructor(baseCanvas, overlayCanvas, tileMetadata) {
        super('Societal', baseCanvas, overlayCanvas);

        this.tileManager = new TileManager(tileMetadata);
        this.offsetX = 0;
        this.offsetY = 0;
    }
 
    async onEnter() {
        console.log('Entering Societal View');
        await this.tileManager.loadVisibleTiles(this.offsetX, this.offsetY, this.baseCanvas.width, this.baseCanvas.height);
        this.startRendering(); // Start the new view's animation
    }

    async drawBase() {
        await this.tileManager.loadVisibleTiles(this.offsetX, this.offsetY, this.baseCanvas.width, this.baseCanvas.height);
        this.tileManager.drawTiles(this.baseCtx, this.offsetX, this.offsetY, this.baseCanvas.width, this.baseCanvas.height);
    }

    drawOverlay() {
        const ctx = this.overlayCtx;
        ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        //this.drawTitle(ctx, 'Societal View');
        this.drawMapScale(ctx, 10, this.overlayCanvas.height - 20, 100, '100 📚');
    }

    handlePanStart(data) {
        this.startPanX = data.x;
        this.startPanY = data.y;
    }

    handlePanMove(data) {
        this.offsetX = Math.max(
            0,
            Math.min(
                this.offsetX - data.deltaX,
                this.tileManager.tileMetadata.gridWidth * this.tileManager.tileMetadata.tileWidth - this.baseCanvas.width
            )
        );

        this.offsetY = Math.max(
            0,
            Math.min(
                this.offsetY - data.deltaY,
                this.tileManager.tileMetadata.gridHeight * this.tileManager.tileMetadata.tileHeight - this.baseCanvas.height
            )
        );

        this.drawBase();
        this.drawOverlay();
    }

    handlePanEnd() {
        console.log('Panning ended');
    }
}
