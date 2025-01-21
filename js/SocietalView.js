import { View } from './View.js';
import { TileManager } from './TileManager.js';

export class SocietalView extends View {
    constructor(baseCanvas, overlayCanvas, tileMetadata) {
        super('Societal', baseCanvas, overlayCanvas);

        this.tileManager = new TileManager(tileMetadata);
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1
        this.scaleWidth = 50000/this.scale;
        this.rare = []; 

    }
 
    async onEnter() {
        console.log('Entering Societal View');
        this.offsetX = this.isbnIndex % this.scaleWidth;
        this.offsetY = Math.floor(this.isbnIndex / this.scaleWidth);
        console.log('offsetX', this.offsetX, 'offsetY', this.offsetY, this.isbnIndex);
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

        // draw the highlighted zone if it's not as height as the cavnas
        if (this.highlightedZone ) {
            const { startRow, endRow, startCol, endCol } = this.highlightedZone;
            const clampedStartRow = Math.max(0, startRow - this.offsetY);
            const clampedEndRow = Math.min(this.overlayCanvas.height, endRow - this.offsetY);
            if (clampedEndRow - clampedStartRow < this.overlayCanvas.height-20) {
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = 'yellow';
                ctx.fillRect(0, clampedStartRow, this.overlayCanvas.width, clampedEndRow - clampedStartRow);
                ctx.globalAlpha = 1;
            }
        }


        // draw the country names in the view        
        const countries = this.getCountriesInView();
        // const drawnPositions = new Set();

        let small_countries = [];
        for (const [index, { startRow, endRow, startCol, endCol, country }] of countries.entries()) {
            const clampedStartRow = Math.max(0, startRow - this.offsetY);
            const clampedStartCol = Math.max(0, startCol - this.offsetX);
            const clampedEndRow = Math.min(this.overlayCanvas.height, endRow - this.offsetY);
            const height = clampedEndRow - clampedStartRow;
            // just draw the country name at the center of the zone
            ctx.fillStyle = 'lightgray';
            const centerX = this.overlayCanvas.width / 2;

            let fontSize;     
            let adjustedX = clampedStartCol+10; 
            if (height <= 5) {
                small_countries.push({clampedStartRow, clampedStartCol, country});
                continue;
            } else if (height <= 20) {
                fontSize = '16px Arial';  // Smaller font for smaller areas
            } else {
                fontSize = '30px Arial';  // Larger font for bigger areas
            }

            ctx.font = fontSize;            
            ctx.fillText(country, adjustedX, (clampedStartRow + clampedEndRow) / 2);
        }    

        // draw the small countries separately
        for (const [index, { clampedStartRow, clampedStartCol, country }] of small_countries.entries()) {
            
            ctx.fillStyle = 'lightgray';
            const width = ctx.measureText(country).width;
            const adjustedX = (index % 13)* 83 + clampedStartCol;
            ctx.font = '12px Arial';            
            ctx.fillText(country, adjustedX, clampedStartRow);
        }


        // draw the map thumbnail and scale indicator
        this.draw_map_thumbnail(ctx, this.scale, this.offsetX, this.offsetY);
        this.drawMapScale(ctx, '100 📚');


        // draw some random star emojis to illustarte rare books

        for (const [x, y, exist] of this.rare) {

            const color = exist ? 'green' : 'red';
            ctx.font = '20px Arial';
            ctx.fillStyle = color;
            ctx.fillText('⭐', x, y);
            // // Or use the hollow star "☆"
            // ctx.fillText('☆', 200, 50); ⭐ ★
        }
        
    }

    handleHover(data) {
        const x = data.x + this.offsetX;
        const y = data.y + this.offsetY;
        this.isbnIndex = (x + (y * this.scaleWidth* this.scale));
        
        // Show the ISBN number in the tooltip
        this.tooltip.x = data.clientX;
        this.tooltip.y = data.clientY;
        this.tooltip.show("ISBN: " + (this.ISBN.baseISBN + this.isbnIndex));


        const isbn = this.ISBN.calculateISBN(this.isbnIndex);
        
        const countryData = this.ISBN.getCountryForISBN(isbn);
        if (countryData) {
            const { prefix, country } = countryData;
            const { startRow, endRow, startCol, endCol} = this.getZoneRange(prefix);

            this.highlightedZone = { startRow, endRow, startCol, endCol, country };
            this.drawOverlay();
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

        // get a new list of rare books
        this.rare = [];
        for (let i = 0; i < 2; i++) {
            // random existing between true / false 
            this.rare.push([Math.random() * this.baseCanvas.width, Math.random() * this.baseCanvas.height,  Math.random() < 0.5 ? true : false]);  
        }

        this.drawBase();
        this.drawOverlay();
    }

    handlePanEnd() {
        console.log("Pan ended with offsets:", this.offsetX, this.offsetY);
    }
}
