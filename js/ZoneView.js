import { View } from './View.js';

export class ZoneView extends View {
    constructor(baseCanvas, overlayCanvas) {
        super('Zone', baseCanvas, overlayCanvas);
        this.image = new Image(); // Pre-rendered image for the zone view
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 10;
        this.highlightedZone = null;
        this.scale * this.scale;
        this.scaleWidth = 50000/this.scale;
        this.zoom = 1;
        this.image.src = './images/all_isbns_1_10.png';
        this.image.onload = () => {
            this.drawBase(); // Draw the image once it is loaded
        };
    }
    onEnter(data) {
        console.log('Entering Zone View');
        // calculate the offset based on the current isbnIndex
        this.offsetX = Math.floor((this.isbnIndex % (this.scaleWidth * this.scale)) / this.scale);-data.x
        if (this.offsetX < 0) this.offsetX = 0;
        if (this.offsetX > this.scaleWidth- this.baseCanvas.width) this.offsetX = this.scaleWidth - this.baseCanvas.width;
        this.offsetY = Math.floor(this.isbnIndex / this.scaleWidth/this.scale/this.scale)- data.y;
        console.log('offsetX', this.offsetX, 'offsetY', this.offsetY, this.isbnIndex);

        this.startRendering(); // Start the new view's animation
    }

    onExit() {
        console.log('Exiting this Zone View');
        this.highlightedZone = null;
        this.tooltip.hide();
        this.clearCanvas();
    }

    drawBase() {
        const ctx = this.baseCtx;

        if (this.image.complete) {
            ctx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
            ctx.drawImage(
                this.image,
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
        // defautl tooltip show the isbn number

        if (this.highlightedZone) {
            const { startRow, endRow, country } = this.highlightedZone;
            const clampedStartRow = Math.max(0, startRow - this.offsetY);
            const clampedEndRow = Math.min(this.overlayCanvas.height, endRow - this.offsetY);

            const height = clampedEndRow - clampedStartRow;
            if (height>2){
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = 'gray';
            } else {
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = 'yellow';
            }
                
            ctx.fillRect(0, clampedStartRow, this.overlayCanvas.width, clampedEndRow - clampedStartRow);

            // draw text in the center of the highlighted zone
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
 
            
            ctx.fillText(country, this.overlayCanvas.width / 2, (clampedStartRow + clampedEndRow) / 2);
        }
        this.drawISBN();
        this.draw_map_thumbnail(ctx, this.scale, this.offsetX, this.offsetY);
        this.drawMapScaleIndicator(ctx, "1000 📚")
    }
    handleHover(data) {
        const x = data.x + this.offsetX;
        const y = data.y + this.offsetY;
        
        this.isbnIndex = (x + (y * this.scaleWidth*this.scale))* this.scale;

        this.tooltip.x = data.clientX;
        this.tooltip.y = data.clientY;
        this.tooltip.show("Scroll/Pinch to zoom in/out");

        const isbn = this.ISBN.calculateISBN(this.isbnIndex);
        
        const countryData = this.ISBN.getCountryForISBN(isbn);
        if (countryData) {
            const { prefix, country } = countryData;
            const { startRow, endRow, startCol, endCol} = this.getZoneRange(prefix);

            this.highlightedZone = {
                startRow,
                endRow,
                startCol,
                endCol,
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
        this.offsetX = Math.max(0, Math.min(this.offsetX, this.image.width - this.baseCanvas.width));
        this.offsetY = Math.max(0, Math.min(this.offsetY, this.image.height - this.baseCanvas.height));

        // Redraw the base canvas and overlay
        this.drawBase();
        this.drawOverlay();
    }

    handlePanEnd() {
        // Optionally, handle logic for when panning ends
        // console.log("Pan ended", this.offsetX, this.offsetY);
    }

}
