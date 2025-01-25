class RarebookManager {
    constructor(tilePath = './rarebook_tiles/', gridSize = 50, tileSize = 1000) {
        this.tilePath = tilePath;
        this.gridSize = gridSize;
        this.tileSize = tileSize;
        this.cache = new Map();
    }

    async loadTile(x, y) {
        if (this.cache.has(`${x}_${y}`)) {
            return this.cache.get(`${x}_${y}`);
        }
        
        const filePath = `${this.tilePath}rare_${x}_${y}.json`;
        try {
            const response = await fetch(filePath);
            const data = await response.json();
            this.cache.set(`${x}_${y}`, data);
            return data;
        } catch (error) {
            console.error(`Failed to load tile (${x}, ${y}):`, error);
            return null;
        }
    }

    async loadVisibleTiles(offsetX, offsetY, viewWidth = 1000, viewHeight = 800) {
        const startX = Math.floor(offsetX / this.tileSize);
        const startY = Math.floor(offsetY / this.tileSize);
        const endX = Math.min(Math.ceil((offsetX + viewWidth) / this.tileSize), this.gridSize - 1);
        const endY = Math.min(Math.ceil((offsetY + viewHeight) / this.tileSize), this.gridSize - 1);

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

    getBooksInView(offsetX, offsetY, viewWidth = 1000, viewHeight = 800) {
        const startX = Math.floor(offsetX / this.tileSize);
        const startY = Math.floor(offsetY / this.tileSize);
        const endX = Math.min(Math.ceil((offsetX + viewWidth) / this.tileSize), this.gridSize - 1);
        const endY = Math.min(Math.ceil((offsetY + viewHeight) / this.tileSize), this.gridSize - 1);

        let booksInView = [];

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x}_${y}`;
                if (this.cache.has(key)) {
                    const tileData = this.cache.get(key);
                    booksInView = booksInView.concat(this.filterBooksByOffset(tileData, offsetX, offsetY, viewWidth, viewHeight));
                }
            }
        }

        return booksInView;
    }

    filterBooksByOffset(tileData, offsetX, offsetY, viewWidth, viewHeight) {
        return tileData.filter(book => 
            book.x >= offsetX && book.x < offsetX + viewWidth &&
            book.y >= offsetY && book.y < offsetY + viewHeight
        );
    }
}

// Example usage
const manager = new RarebookManager();
const offsetX = 5000, offsetY = 3000;  // Example offsets

(async () => {
    await manager.loadVisibleTiles(offsetX, offsetY);
    const booksToDisplay = manager.getBooksInView(offsetX, offsetY);
    console.log("Books in current view:", booksToDisplay);
})();
