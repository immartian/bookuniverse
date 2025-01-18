import { View } from './View.js';
import { ISBN } from './ISBN.js';

export class BookshelfView extends View {
    constructor(baseCanvas, overlayCanvas, gridWidth, gridHeight) {
        super('Bookshelf', baseCanvas, overlayCanvas);

        this.gridWidth = gridWidth; // Number of columns in the grid
        this.gridHeight = gridHeight; // Number of rows in the grid
        this.cellWidth = 80; // Book cover width
        this.cellHeight = 120; // Book cover height

        this.offsetX = 0; // Horizontal offset for panning
        this.offsetY = 0; // Vertical offset for panning

        this.baseISBN = 978000000000; // Base ISBN number
        this.bookCovers = {}; // Cache for loaded book covers
    }

    onEnter() {
        console.log('Lowlevel: Entering Bookshelf View');
        // this.drawBase();
        this.drawOverlay();

    }

    async drawBase() {
        const ctx = this.baseCtx;
        ctx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
        // draw a black background first
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('Bookshelf View', this.baseCanvas.width / 2, this.baseCanvas.height / 2);
        // // Draw grid rectangles
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
        //         const x = col * this.cellWidth - this.offsetX;
        //         const y = row * this.cellHeight - this.offsetY;

        //         // Skip cells outside the visible area
        //         if (x + this.cellWidth < 0 || x > this.baseCanvas.width || y + this.cellHeight < 0 || y > this.baseCanvas.height) {
        //             continue;
        //         }

        //         ctx.strokeStyle = 'gray';
        //         ctx.strokeRect(x, y, this.cellWidth, this.cellHeight);
                // ctx.fillStyle = 'gray';
                // ctx.fillRect(col * this.cellWidth, row * this.cellHeight, this.cellWidth, this.cellHeight);
            }
        }
    }

    async drawOverlay() {
        const ctx = this.overlayCtx;
        ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        // draw a black background first
        // ctx.fillStyle = 'black';
        // ctx.fillRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        // draw a centeralized text
        // ctx.fillStyle = 'white';
        // ctx.font = '20px Arial';
        // ctx.fillText('Bookshelf View', this.overlayCanvas.width / 2, this.overlayCanvas.height / 2);

        // Draw book covers on the overlay canvas
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
        //         const x = col * this.cellWidth - this.offsetX;
        //         const y = row * this.cellHeight - this.offsetY;

        //         // Skip cells outside the visible area
        //         if (x + this.cellWidth < 0 || x > this.overlayCanvas.width || y + this.cellHeight < 0 || y > this.overlayCanvas.height) {
        //             continue;
        //         }

                const tileIndex = this.offsetY*50000 + this.offsetX + row*this.gridWidth + col;
                const isbn12 = this.baseISBN + tileIndex;
                const isbn13 = ISBN.addChecksum(isbn12.toString());
                // const imageUrl = this.getBookCoverUrl(isbn13);
                const part1 = isbn13.slice(-4, -2);
                const part2 = isbn13.slice(-2);
                // Image URL pattern
                const imageUrl = `https://images.isbndb.com/covers/${part1}/${part2}/${isbn13}.jpg`;
                // Load and draw the image
                const img = new Image();
                img.src = imageUrl;
                img.onload = () => {
                    ctx.drawImage(img, col*this.cellWidth, row*this.cellHeight, this.cellWidth, this.cellHeight);
                };
                img.onerror = () => {
                    // If the image fails to load, use a fallback color
                    ctx.fillStyle = "green";
                    ctx.fillRect(x, y, rectWidth, rectHeight);
                };
        //         // Draw book cover if it exists in the cache
        //         if (this.bookCovers[isbn13]) {
        //             ctx.drawImage(this.bookCovers[isbn13], x, y, this.cellWidth, this.cellHeight);
        //         } else {
        //             // Load the book cover if not already cached
        //             this.loadBookCover(isbn13, imageUrl, x, y);
        //         }
            }
        }
    }


    handlePanMove(data) {
        this.offsetX = Math.max(0, this.offsetX + data.deltaX);
        this.offsetY = Math.max(0, this.offsetY + data.deltaY);

        // Redraw both base and overlay canvases
        this.drawOverlay();
    }



    handleDoubleClick(data) {
        console.log('Double click at:', data.x, data.y);
        const col = Math.floor(data.x / this.cellWidth);
        const row = Math.floor(data.y / this.cellHeight);

        //get the ISBN number
        const tileIndex = this.offsetY*50000 + this.offsetX + row*this.gridWidth + col;
        const isbn12 = this.baseISBN + tileIndex;
        const isbn13 = ISBN.addChecksum(isbn12.toString());
        // jump to Annas-archive

        const searchUrl = `https://annas-archive.org/search?index=meta&q=${isbn13}`;
        window.open(searchUrl, "_blank");
    }
}
