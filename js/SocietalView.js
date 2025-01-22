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
        this.rare_one = null;
    }
 
    async onEnter(data) {
        console.log('Entering Societal View');
        this.offsetX = Math.floor((this.isbnIndex % (this.scaleWidth * this.scale)) / this.scale);-data.x
        this.offsetY = Math.floor(this.isbnIndex / this.scaleWidth/this.scale/this.scale)- data.y;
        if (this.offsetX < 0) this.offsetX = 0;
        if (this.offsetX > this.baseCanvas.width) this.offsetX = this.scaleWidth - this.baseCanvas.width;
        //await this.tileManager.loadVisibleTiles(this.offsetX, this.offsetY, this.baseCanvas.width, this.baseCanvas.height);
        this.startRendering(); // Start the new view's animation
    }

    async drawBase() {
        // draw background to prevent flickering
        const ctx = this.baseCtx;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);

        await this.tileManager.loadVisibleTiles(this.offsetX, this.offsetY, this.baseCanvas.width, this.baseCanvas.height);
        this.tileManager.drawTiles(this.baseCtx, this.offsetX, this.offsetY, this.baseCanvas.width, this.baseCanvas.height);
    }

    drawOverlay() {
        const ctx = this.overlayCtx;
        ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        // draw the highlighted zone if it's not as height as the cavnas
        let hightlighted_country; 
        if (this.highlightedZone ) {
            const { startRow, endRow, startCol, endCol, country } = this.highlightedZone;
            hightlighted_country = country;
            const clampedStartRow = Math.max(0, startRow - this.offsetY);
            const clampedStartCol = Math.max(0, startCol - this.offsetX);
            const clampedEndCol = Math.min(this.overlayCanvas.width, endCol - this.offsetX);
            const clampedEndRow = Math.min(this.overlayCanvas.height, endRow - this.offsetY);
            const height = clampedEndRow - clampedStartRow;

            if (height < this.overlayCanvas.height-20) {
                ctx.globalAlpha = 0.2;
                if (height <= 2)     ctx.globalAlpha = 0.8;
                ctx.fillStyle = 'yellow';
                ctx.fillRect(clampedStartCol, clampedStartRow, clampedEndCol - clampedStartCol, height > 0 ? height : 1);
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
                if (hightlighted_country === country) {
                    ctx.fillStyle = 'yellow';
                    fontSize = '20px Arial';  // Larger font for highlighted areas
                }
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
            if (hightlighted_country === country) {
                ctx.fillStyle = 'yellow';
                ctx.font = '20px Arial';            
            }
            ctx.fillText(country, adjustedX, clampedStartRow);
        }


        // draw the map thumbnail and scale indicator
        this.drawISBN();
        this.draw_map_thumbnail(ctx, this.scale, this.offsetX, this.offsetY);
        this.drawMapScale(ctx, '100 📚');


        // draw some random star emojis to illustarte rare books

        for (const [x, y, exist] of this.rare) {

            const color = exist ? 'green' : 'red';
            ctx.font = '20px Arial';
 
            if (this.rare_one )
                ctx.font = '30px Arial';
            ctx.fillStyle = color;
            if(exist) ctx.fillText('📗', x, y);
            else ctx.fillText('📕', x, y);
            //ctx.fillText('⭐', x, y);
            // // Or use the hollow star "☆"
            // ctx.fillText('☆', 200, 50); ⭐ ★
        }
        
    }

    handleHover(data) {
        const x = data.x + this.offsetX;
        const y = data.y + this.offsetY;
        this.isbnIndex = (x + (y * this.scaleWidth*this.scale))* this.scale;
        
        // Show the ISBN number in the tooltip
        this.tooltip.x = data.clientX;
        this.tooltip.y = data.clientY;
        this.tooltip.show("Scrool/Pinch to zoom out");   

        // prepare the zone if the mouse is over a country
        const isbn = this.ISBN.calculateISBN(this.isbnIndex);
        
        const countryData = this.ISBN.getCountryForISBN(isbn);
        if (countryData) {
            const { prefix, country } = countryData;
            const { startRow, endRow, startCol, endCol} = this.getZoneRange(prefix);

            this.highlightedZone = { startRow, endRow, startCol, endCol, country };
            this.drawOverlay();
        }

        // prepare the rare book which is under the mouse
        this.rare_one = this.rare.find(([x1, y1, exist]) => {
            const x = data.x;
            const y = data.y;
            return x >= x1 && x <= x1 + 20 && y >= y1 - 20 && y <= y1;
        }     
        );
        
        // get the color under the mouse from baseCanvas
        const ctx = this.baseCtx;
        const pixel = ctx.getImageData(data.x, data.y, 1, 1);
        const c = pixel.data;
        
        // data is an array with [R, G, B, A] values
        const red = c[0];
        const green = c[1];
        const blue = c[2];
        const alpha = c[3];
        
        // Convert to color string if needed
        this.isbn_color = `rgb(${red}, ${green}, ${blue})`;
        
    }

    handleDoubleClick(data) {
        //get the isbn with 13 digits
        const x = data.x + this.offsetX;
        const y = data.y + this.offsetY;
        this.isbnIndex = (x + (y * this.scaleWidth*this.scale))* this.scale;
        const isbn = this.ISBN.calculateISBN(this.isbnIndex, true);
        // open annas-archive page to search it
        const searchUrl = `https://annas-archive.org/isbndb/${isbn}`;
        window.open(searchUrl, "_blank");
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
