import { View } from './View.js';

export class ZoneView extends View {
    constructor(baseCanvas, overlayCanvas) {
        super('Zone', baseCanvas, overlayCanvas);
        this.imageData = new Image(); // Pre-rendered image for the zone view
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 10;
        this.highlightedZone = null;
        
        this.isbnPerPixel = 100;
        this.imageWidth = 5000;
        this.zoom = 1;
        this.imageData.src = './images/all_isbns_1_10.png';
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
        this.draw_map_thumbnail(ctx, this.scale, this.offsetX, this.offsetY);
        this.drawMapScale(ctx, "1000 📚")
    }

    getZoneRange(prefix) {
        const startISBN = this.ISBN.padToISBN(prefix, "0");
        const endISBN = this.ISBN.padToISBN(prefix, "9");
        // const startRow = Math.floor((startISBN - this.baseISBN) / this.isbnPerPixel / this.imageWidth);
        // const endRow = Math.floor((endISBN - this.baseISBN) / this.isbnPerPixel / this.imageWidth);

        let startRow, endRow;  
        let startCol = 0, endCol = this.imageWidth
        /// special case for 978-0 and 978-1 
        if (prefix === "9780" || prefix === "9781") {
            startRow = Math.floor((this.ISBN.padToISBN("978-0", "0") - this.ISBN.baseISBN) / this.isbnPerPixel / this.imageWidth);
            endRow = Math.floor((this.ISBN.padToISBN("978-1", "9") - this.ISBN.baseISBN) / this.isbnPerPixel / this.imageWidth);
        }
        else
        {
            startRow = Math.floor((startISBN - this.ISBN.baseISBN) / this.isbnPerPixel / this.imageWidth);
            endRow = Math.floor((endISBN - this.ISBN.baseISBN) / this.isbnPerPixel / this.imageWidth);
            // there are some small countries that won't cover a full row
            // so we need to adjust the start and end columns
            startCol = (startISBN - this.ISBN.baseISBN) / this.isbnPerPixel % this.imageWidth;
            endCol = (endISBN - this.ISBN.baseISBN) / this.isbnPerPixel % this.imageWidth;
        }

        return { startRow, endRow, startCol, endCol };
    }

    handleHover(data) {
        const x = data.x + this.offsetX;
        const y = data.y + this.offsetY;
        const isbnIndex = (x + (y * this.imageWidth)) * this.isbnPerPixel;

        const isbn = this.ISBN.calculateISBN(isbnIndex);
        
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
