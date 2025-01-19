import { View } from './View.js';
import { TileManager } from './TileManager.js';

export class SocietalView extends View {
    constructor(baseCanvas, overlayCanvas, tileMetadata) {
        super('Societal', baseCanvas, overlayCanvas);

        this.tileManager = new TileManager(tileMetadata);
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1
        this.rare = []; 
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

        this.draw_map_thumbnail(ctx, this.scale, this.offsetX, this.offsetY);
        this.drawMapScale(ctx, '100 📚');

        // draw some random star emojis to illustarte rare books
        this.rare = [];
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * this.overlayCanvas.width;
            const y = Math.random() * this.overlayCanvas.height;
            this.rare.push([x, y]);
        }
        for (const [x, y] of this.rare) {
            ctx.font = '20px Arial';
            ctx.fillText('⭐', x, y);
        }

        
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
