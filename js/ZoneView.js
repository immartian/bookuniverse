import { ISBNCountyHandler } from './Countries.js';
import { View } from './View.js';

export class ZoneView extends View {
    constructor(baseCanvas, overlayCanvas) {
        super('Zone', baseCanvas, overlayCanvas);
        this.zoneHandler = new ISBNCountyHandler(100, 5000);
        this.imageData = new Image(); // Pre-rendered image for the zone view
        this.offsetX = 0;
        this.offsetY = 0;
        this.highlightedZone = null;
        
        this.imageData.src = './all_isbns_smaller10x.png';
        this.imageData.onload = () => {
            this.drawBase(); // Draw the image once it is loaded
        };
    }
    onEnter() {
        console.log('Entering Zone View');
        this.startRendering(); // Start the new view's animation
    }

    onExit() {
        console.log('Exiting this Zone View');
        this.clearCanvas();
        this.highlightedZone = null;
    }

    drawBase() {
        const ctx = this.baseCtx;

        if (this.imageData.complete) {
            ctx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
            ctx.drawImage(
                this.imageData,
                this.offsetX, this.offsetY,
                this.baseCanvas.width, this.baseCanvas.height,
                0, 0,
                this.baseCanvas.width, this.baseCanvas.height
            );
        } else {
            console.error('Image data not loaded yet.');
        }
    }

    drawOverlay() {
        const ctx = this.overlayCtx;
        ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        if (this.highlightedZone) {
            const { startRow, endRow, country } = this.highlightedZone;
            const clampedStartRow = Math.max(0, startRow - this.offsetY);
            const clampedEndRow = Math.min(this.overlayCanvas.height, endRow - this.offsetY);

            ctx.globalAlpha = 0.2;
            ctx.fillStyle = 'gray';
            
            ctx.fillRect(0, clampedStartRow, this.overlayCanvas.width, clampedEndRow - clampedStartRow);

            ctx.globalAlpha = 1;
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.fillText(country, 50, clampedStartRow + 20);
        }
        this.drawTitle(ctx, 'Books in view (233,002)');
        this.drawMapScale(ctx, 10, this.overlayCanvas.height-20, 100, "1000 📚")
    }

    handleHover(data) {
        const isbn = this.zoneHandler.calculateISBN(data.x + this.offsetX, data.y + this.offsetY);
        const countryData = this.zoneHandler.getCountryForISBN(isbn);
        if (countryData) {
            const { prefix, country } = countryData;
            const { startRow, endRow } = this.zoneHandler.getZoneRange(prefix);

            this.highlightedZone = {
                startRow,
                endRow,
                country,
            };
        } else {
            this.highlightedZone = null;
        }

        this.drawOverlay();
    }

    handlePanStart(data) {
        // Optionally, you can handle custom logic for when panning begins.
    }

    handlePanMove(data) {
        // Update offsets using delta values
        this.offsetX -= data.deltaX;
        this.offsetY -= data.deltaY;

        // Clamp offsets to stay within image boundaries
        this.offsetX = Math.max(0, Math.min(this.offsetX, this.imageData.width - this.baseCanvas.width));
        this.offsetY = Math.max(0, Math.min(this.offsetY, this.imageData.height - this.baseCanvas.height));

        // Redraw the base canvas and overlay
        this.drawBase();
        this.drawOverlay();
    }

    handlePanEnd() {
        // Optionally, handle logic for when panning ends
    }

}
