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
    }

    onEnter() {
        console.log('Lowlevel: Entering Bookshelf View');
        this.drawBase();
        this.drawOverlay();
        this.rarebookManager.loadVisibleTiles(this.offsetX, this.offsetY)

    }

    async drawBase() {

        // still draw a black background for the base canvas
        const ctx = this.baseCtx;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);


        const virtualCanvas = document.createElement('canvas');
        virtualCanvas.width = 1000;
        virtualCanvas.height = 800;
        const virtualCtx = virtualCanvas.getContext('2d');
    
        // Load only visible tiles based on current offsets
        await this.tileManager.loadVisibleTiles(this.offsetX, this.offsetY, this.baseCanvas.width, this.baseCanvas.height);
    
        for (let tileX = 0; tileX < 50; tileX++) {
            for (let tileY = 0; tileY < 50; tileY++) {
                const tileKey = `${tileX}_${tileY}`;
                const tileImage = this.tileManager.loadedTiles[tileKey];
    
                if (tileImage) {
                    virtualCtx.drawImage(tileImage, tileX * 1000, tileY * 800);
                }
            }
        }
    
        // Extract pixel data once
        this.imageData = virtualCtx.getImageData(0, 0, virtualCanvas.width, virtualCanvas.height);
    }
    
   
    
    calculateIconGrid() {
        // Calculate number of icons fitting horizontally and vertically
        return [
            Math.ceil(this.overlayCanvas.width / this.iconWidth), 
            Math.ceil(this.overlayCanvas.height / this.iconHeight)
        ];
    }

    async drawOverlay() {
        const overlayCtx = this.overlayCtx;
        overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        const [total_cols, total_rows] = this.calculateIconGrid();

        const pixels = this.imageData.data;  // Pixel data extracted from virtual canvas

        for (let row = 0; row < total_rows; row++) {
            for (let col = 0; col < total_cols; col++) {
                const x = col * this.iconWidth - this.offsetX;
                const y = row * this.iconHeight - this.offsetY;

                // Calculate pixel index in the image data
                const pixelIndex = (row * 1000 + col) * 4;
                const r = pixels[pixelIndex];
                const g = pixels[pixelIndex + 1];
                const b = pixels[pixelIndex + 2];

                let bookIcon = '';
                if (r > 200 && g < 100 && b < 100) {
                    bookIcon = '📕';  // Red - Absent book
                } else if (g > 200 && r < 100 && b < 100) {
                    bookIcon = '📗';  // Green - Available book
                } else {
                    continue;  // Black - No book to display
                }

                // Draw book icon aligned with the calculated grid
                overlayCtx.font = this.iconWidth + 'px Arial';
                overlayCtx.fillText(bookIcon, x, y + this.iconHeight - 8);
            }
        }


        
        // get a new list of rare books for current view
        this.rarebooks = this.rarebookManager.getBooksInView(this.offsetX, this.offsetY, this.baseCanvas.width, this.baseCanvas.height);
        // get 20 of them only 
        this.rarebooks = this.rarebooks.slice(0, 20);
        // draw the rare books in the view
        this.rarebooks.forEach(book => {
            // calculate the x,y position based on isbn index
            book.x = this.iconWidth*Math.round((((Math.floor(book.i / 10) - this.ISBN.baseISBN) % this.scaleWidth) * this.scale) - this.offsetX);           
            book.y = this.iconHeight*Math.round((((Math.floor(book.i / 10) - this.ISBN.baseISBN) / this.scaleWidth) * this.scale) - this.offsetY);
            // get the color of the pixel from baseCanvas
            overlayCtx.font = '12px Arial';
            console.log(book.x, book.y, book.e);
            if(book.e)
                overlayCtx.fillText ("⭐", book.x, book.y);
        });    
    
        // // prepare the rare book which is under the mouse
        // this.rare_one = this.rarebooks.find((book) => {
        //     const x = data.x;
        //     const y = data.y;
        //     const title = book["t"];
        //     const holdings = book["h"];
        //     const rare_touch = x >= book["x"] && x <= book["x"] + 20 && y >= book["y"] - 20 && y <= book["y"];
        //     if(rare_touch){
        //                 // Show the ISBN number in the tooltip
        //         this.tooltip.x = data.clientX;
        //         this.tooltip.y = data.clientY;
        //         // show the isbn cover image in tooltip
        //         const isbn13 = book["i"];  //this.ISBN.calculateISBN(this.isbnIndex, true);
        //         const part1 = String(isbn13).slice(-4, -2);
        //         const part2 = String(isbn13).slice(-2);
        //                         // Image URL pattern
        //         const imageUrl = `https://images.isbndb.com/covers/${part1}/${part2}/${isbn13}.jpg`;

        //         // make a tooltip with the bookcard style
        //         const innerHTML = "<div class='book-card'><img src='"+imageUrl+"' alt='Book Cover' class='book-cover'>"+
        //         "<div class='book-details'>"+
        //         "<div class='book-title'>"+title+"</div>"+
        //         "<div class='book-isbn'>"+isbn13+"</div>"+
        //         "<div class='book-copies'>"+
        //         "<span class='rare-icon'> Copies: "+( holdings + (book.e ? '<br>📗 In Annas-Archive' : '<br>📕 Not in Annas-Archive') )+"</span>"+ 
        //         // (exist ? 'Rare' : 'Not Rare')+
        //         "</div>"+
        //         "</div>";
        //         this.tooltip.show(innerHTML);

        //     }
        //     else
        //         this.tooltip.hide();
            
        //     return rare_touch
        // }     
        // );
        
        
        // draw the map thumbnail and scale indicator


    }


    handlePanMove(data) {
        this.offsetX = Math.max(0, this.offsetX + Math.round(data.deltaX)/this.iconWidth);
        this.offsetY = Math.max(0, this.offsetY + Math.round(data.deltaY)/this.iconHeight);

        // Redraw both base and overlay canvases
        this.drawOverlay();
    }



    handleDoubleClick(data) {
        console.log('Double click at:', data.x, data.y);
        const col = Math.floor(data.x / this.iconWidth);
        const row = Math.floor(data.y / this.iconHeight);

        //get the ISBN number
        const tileIndex = this.offsetY*50000 + this.offsetX + row*this.gridWidth + col;
        const isbn12 = this.baseISBN + tileIndex;
        const isbn13 = ISBN.addChecksum(isbn12.toString());
        // jump to Annas-archive

        const searchUrl = `https://annas-archive.org/search?index=meta&q=${isbn13}`;
        window.open(searchUrl, "_blank");
    }
}
