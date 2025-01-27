import { View } from './View.js';
import { ISBN } from './ISBN.js';
import { TileManager } from './TileManager.js';
import { RarebookManager } from './RarebookManager.js';


export class BookshelfView extends View {
    constructor(baseCanvas, overlayCanvas, tiles_meta) {
        super('Bookshelf', baseCanvas, overlayCanvas);

        this.tileManager = new TileManager(tiles_meta);
        this.gridWidth = tiles_meta.gridWidth; // Number of columns in the grid
        this.gridHeight = tiles_meta.gridHeight; // Number of rows in the grid

        this.iconWidth = 20;  // Visual width of each icon
        this.iconHeight = 30; // Visual height of each icon
        
        this.scale = 1;
        this.scaleWidth = 50000/this.scale;

        this.offsetX = 0; // Horizontal offset for panning
        this.offsetY = 0; // Vertical offset for panning

        this.rarebookManager = new RarebookManager();
        this.rarebooks = []; 
        this.rare_one = null;
        this.bookCovers = {}; // Cache for loaded book covers

        this.virtualCanvas = document.createElement('canvas');
        this.virtualCanvas.width = 1000;
        this.virtualCanvas.height = 800;
        this.virtualCtx = this.virtualCanvas.getContext('2d', { willReadFrequently: true });
    }

    onEnter(data) {
        console.log('Lowlevel: Entering Bookshelf View', 'ISBN offset:', this.isbnIndex, 'OffsetX:', this.offsetX, 'OffsetY:', this.offsetY);
        this.offsetX = Math.floor((this.isbnIndex % (this.scaleWidth * this.scale)) / this.scale)-data.x;
        this.offsetY = Math.floor(this.isbnIndex / this.scaleWidth/this.scale/this.scale)- data.y;
        if (this.offsetX < 0) this.offsetX = 0;
        if (this.offsetX > this.scaleWidth- this.baseCanvas.width) this.offsetX = this.scaleWidth - this.baseCanvas.width;

        this.rarebookManager.loadVisibleTiles(this.offsetX, this.offsetY)
        // Reload tiles for the new offset
        this.tileManager.loadVisibleTiles(this.offsetX, this.offsetY, this.baseCanvas.width, this.baseCanvas.height)
            .then(() => {
                this.drawBase();
                this.drawOverlay();
            });
    }

    async drawBase() {
        const ctx = this.baseCtx;
        ctx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
    
        // Load and draw tiles dynamically

        // draw visible tiels on the virtual canvas based on their locations
        this.tileManager.drawTiles(this.virtualCtx, this.offsetX, this.offsetY, this.baseCanvas.width, this.baseCanvas.height);


        // Extract pixel data once and apply it with the current offsets
        this.imageData = this.virtualCtx.getImageData(
            0,
            0,
            this.baseCanvas.width,
            this.baseCanvas.height
        );        
        const total_cols =  Math.ceil(this.overlayCanvas.width / this.iconWidth); 
        const total_rows  = Math.ceil(this.overlayCanvas.height / this.iconHeight); 

        const pixels = this.imageData.data;
    
        for (let row = 0; row < total_rows; row++) {
            for (let col = 0; col < total_cols; col++) {
                const x = col * this.iconWidth - (this.offsetX % this.iconWidth);
                const y = row * this.iconHeight - (this.offsetY % this.iconHeight);
    
                const pixelIndex = ((row + Math.floor(this.offsetY / this.iconHeight)) * 1000 + 
                                   (col + Math.floor(this.offsetX / this.iconWidth))) * 4;
    
                const r = pixels[pixelIndex];
                const g = pixels[pixelIndex + 1];
                const b = pixels[pixelIndex + 2];
    
                let bookIcon = '';
                if (r > 200 && g < 100 && b < 100) {
                    bookIcon = '📕';  // Red - Absent book
                } else if (g > 200 && r < 100 && b < 100) {
                    bookIcon = '📗';  // Green - Available book
                } else {
                    continue;
                }
    
                ctx.font = `${this.iconWidth}px Arial`;
                ctx.fillText(bookIcon, x, y + this.iconHeight - 8);
            }
        }
    }
    
    
    calculateBookPosition(isbnIndex) {
        const bookIndex = Math.floor(isbnIndex / 10) - this.ISBN.baseISBN;
    
        // Determine the book's column and row within the scaled grid
        const col = (bookIndex % this.scaleWidth) / this.scale;
        const row = Math.floor(bookIndex / this.scaleWidth) / this.scale;
    
        // Calculate position adjusted for offsets
        const x = Math.floor(col * this.iconWidth) - this.offsetX;
        const y = Math.floor(row * this.iconHeight) - this.offsetY;
    
        return { x, y };
    }
    
    async drawOverlay() {
        const overlayCtx = this.overlayCtx;
        overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    
        // Get rare books currently visible in the viewport
        await this.rarebookManager.loadVisibleTiles(this.offsetX, this.offsetY);
        this.rarebooks = this.rarebookManager.getRareBooksInView(this.offsetX, this.offsetY, this.baseCanvas.width, this.baseCanvas.height);
           
        this.rarebooks.forEach(book => {
            // // Convert ISBN index to row and column based on full grid
            // ({x: book.x, y: book.y} = this.calculateBookPosition(book.i));
            const iconX = (book.x- this.offsetX)*this.iconWidth - (this.offsetX % this.iconWidth); 
            const iconY = (book.y - this.offsetY)*this.iconHeight - (this.offsetY % this.iconHeight);
            // // Ensure the book is within the visible viewport
            if (iconX >= 0 && iconX < this.overlayCanvas.width && iconY >= 0 && iconY < this.overlayCanvas.height) {
            overlayCtx.font = '14px Arial';
            overlayCtx.fillStyle = 'yellow';
            overlayCtx.fillText("🔥", iconX+6 , iconY + 20);
            }
        });
        
        this.drawISBN();
        // draw the map thumbnail and scale indicator
        this.draw_map_thumbnail(this.overlayCtx, this.scale, this.offsetX, this.offsetY);
        this.drawMapScaleIndicator(this.overlayCtx, '5 📚');
    }
    
    
    
    handleHover(data) {
        const x = Math.floor((data.x + this.offsetX)/this.iconWidth);
        const y = Math.floor((data.y + this.offsetY)/this.iconHeight);
        this.isbnIndex = (x + (y * this.scaleWidth*this.scale))* this.scale;
        // prepare the zone if the mouse is over a country
        const isbn = this.ISBN.calculateISBN(this.isbnIndex, true);
 
        // find a rare book matching current isbn under mouse
        const found_book = this.rarebooks.find(book => {
            if (book.i === isbn) 
                return book;
            else 
                return null;
        }
        );     

        // Show the ISBN number in the tooltip
        this.tooltip.x = data.clientX;
        this.tooltip.y = data.clientY;

        if (found_book) {
                // Show the book's title and number of holdings in the tooltip
                
                const title = found_book.t;
                const holdings = found_book.h;
            

                    // show the isbn cover image in tooltip
                    const isbn13 = found_book.i;  //this.ISBN.calculateISBN(this.isbnIndex, true);
                    const part1 = String(isbn13).slice(-4, -2);
                    const part2 = String(isbn13).slice(-2);
                                    // Image URL pattern
                    const imageUrl = `https://images.isbndb.com/covers/${part1}/${part2}/${isbn13}.jpg`;
    
                    // make a tooltip with the bookcard style
                    const innerHTML = "<div class='book-card'><img src='"+imageUrl+"' alt='Book Cover' class='book-cover'>"+
                    "<div class='book-details'>"+
                    "<div class='book-title'>"+title+"</div>"+
                    "<div class='book-isbn'>"+isbn13+"</div>"+
                    "<div class='book-copies'>"+
                    "<span class='rare-icon'> Copies: "+( holdings + (found_book.e ? '<br>📗 In Annas-Archive' : '<br>📕 Not in Annas-Archive') )+"</span>"+ 
                    // (exist ? 'Rare' : 'Not Rare')+
                    "</div>"+
                    "</div>";
                    this.tooltip.show(innerHTML);
    
            }
            else
                this.tooltip.show(isbn);
    }
        

    handlePanStart(data) {
        this.startPanX = data.x;
        this.startPanY = data.y;
    }


    handlePanMove(data) {
        const stepX = Math.round(data.deltaX / this.iconWidth);
        const stepY = Math.round(data.deltaY / this.iconHeight);
    
        this.offsetX = Math.max(0, this.offsetX - stepX ); //* this.iconWidth);
        this.offsetY = Math.max(0, this.offsetY - stepY ); //* this.iconHeight);
    
        // Ensure offsets do not exceed the boundaries
        this.offsetX = Math.min(this.offsetX, this.scaleWidth - this.overlayCanvas.width);
        this.offsetY = Math.min(this.offsetY, 40000 - this.overlayCanvas.height);
    
        // Reload tiles for the new offset
        this.tileManager.loadVisibleTiles(this.offsetX, this.offsetY, this.baseCanvas.width, this.baseCanvas.height)
            .then(() => {
                this.drawBase();
                this.drawOverlay();
            });
    }
    
    handleDoubleClick(data) {
        const col = Math.floor(data.x / this.iconWidth);
        const row = Math.floor(data.y / this.iconHeight);
        //get the ISBN number
        const isbnIndex = (this.offsetY+row)*50000 + this.offsetX  + col;
        const isbn12 = this.ISBN.baseISBN + isbnIndex;
        const isbn13 = ISBN.addChecksum(isbn12.toString());
        // jump to Annas-archive

        const searchUrl = `https://annas-archive.org/search?index=meta&q=${isbn13}`;
        window.open(searchUrl, "_blank");
    }

    handlePanEnd() {
        console.log('Pan ended with offsets:', this.offsetX, this.offsetY);
    }
}
