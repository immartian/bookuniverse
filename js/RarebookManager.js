export class RarebookManager {
    constructor(tilePath = './rarebook_tiles/', gridSize = 50, tileWidth = 1000, tileHeight = 800) {
        this.tilePath = tilePath;
        this.gridSize = gridSize;
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
        this.cache = new Map();
    }

    async loadTile(x, y) {
        if (this.cache.has(`${x}_${y}`)) {
            return this.cache.get(`${x}_${y}`);
        }
        
        const filePath = `${this.tilePath}tile_${x}_${y}.json`;
        try {
            const response = await fetch(filePath);
            const data = await response.json();
            this.cache.set(`${x}_${y}`, data);
            if (Array.isArray(data)) {
                //console.log(`Tile (0,2) contains ${data.length} books.`);
                data.forEach(book => {
                    if (!book.i || !book.t || !book.h) {
                        console.warn(`Invalid book entry:`, book);
                    }
                });
            } else {
                console.error(`Unexpected data format for tile (0,2):`, data);
            }
                                return data;
        } catch (error) {
            console.error(`Failed to load tile (${x}, ${y}):`, error);
            return null;
        }
    }

    async loadVisibleTiles(offsetX, offsetY, viewWidth = 1000, viewHeight = 800) {
        const startX = Math.floor(offsetX / this.tileWidth);
        const startY = Math.floor(offsetY / this.tileHeight);
        const endX = Math.min(Math.ceil((offsetX + viewWidth) / this.tileWidth), this.gridSize - 1);
        const endY = Math.min(Math.ceil((offsetY + viewHeight) / this.tileHeight), this.gridSize - 1);

        const promises = [];
        for (let x = startX - 1; x <= endX + 1; x++) {
            for (let y = startY - 1; y <= endY + 1; y++) {
                if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
                    promises.push(this.loadTile(x, y));
                }
            }
        }
    
        await Promise.all(promises);
    }

    getRareBooksInView(offsetX, offsetY, viewWidth = 1000, viewHeight = 800) {
        const startX = Math.floor(offsetX / this.tileWidth);
        const startY = Math.floor(offsetY / this.tileHeight);
        const endX = Math.min(Math.ceil((offsetX + viewWidth) / this.tileWidth), this.gridSize - 1);
        const endY = Math.min(Math.ceil((offsetY + viewHeight) / this.tileHeight), this.gridSize - 1);

        let booksInView = [];
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x}_${y}`;
                console.log(`Checking tile ${key}`);
                if (this.cache.has(key)) {
                    const tileData = this.cache.get(key);
                    booksInView = booksInView.concat(this.filterBooksByView(tileData, offsetX, offsetY, viewWidth, viewHeight));
                }
            }
        }
        return booksInView;
    }

    filterBooksByView(tileData, offsetX, offsetY, viewWidth, viewHeight) {
        return tileData.filter(book => {
            // we only need a small range  of isbn to be visible within the viewport
            book.x = (Math.floor(book.i/10) - 978000000000) % 50000;
            book.y = Math.floor((book.i/10- 978000000000) / 50000);

            return book.x >= offsetX && book.x <= offsetX + viewWidth && book.y >= offsetY && book.y <= offsetY + viewHeight;
        });
    }
}