export class TileManager {
    constructor(tileMetadata) {
        this.tileMetadata = tileMetadata;
        this.loadedTiles = {}; // Cache for loaded tiles
    }

    async loadTile(x, y) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const tileKey = `${x}_${y}`;
            img.src = `${this.tileMetadata.tileDir}tile_${tileKey}.png`;
            img.onload = () => {
                this.loadedTiles[tileKey] = img;
                resolve();
            };
            img.onerror = () => reject(`Failed to load tile at (${x}, ${y})`);
        });
    }

    async loadVisibleTiles(offsetX, offsetY, canvasWidth, canvasHeight) {
        const visibleTiles = this.getVisibleTiles(offsetX, offsetY, canvasWidth, canvasHeight);
        const loadPromises = visibleTiles.map(([x, y]) => {
            const tileKey = `${x}_${y}`;
            if (!this.loadedTiles[tileKey]) {
                return this.loadTile(x, y);
            }
            return Promise.resolve(); // Skip already loaded tiles
        });
        await Promise.all(loadPromises);
    }

    getVisibleTiles(offsetX, offsetY, canvasWidth, canvasHeight) {
        const { tileWidth, tileHeight, gridWidth, gridHeight } = this.tileMetadata;

        const startTileX = Math.floor(offsetX / tileWidth);
        const startTileY = Math.floor(offsetY / tileHeight);
        const endTileX = Math.ceil((offsetX + canvasWidth) / tileWidth);
        const endTileY = Math.ceil((offsetY + canvasHeight) / tileHeight);

        const visibleTiles = [];
        for (let x = startTileX; x <= endTileX; x++) {
            for (let y = startTileY; y <= endTileY; y++) {
                if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                    visibleTiles.push([x, y]);
                }
            }
        }
        return visibleTiles;
    }

    drawTiles(ctx, offsetX, offsetY, canvasWidth, canvasHeight) {
        const { tileWidth, tileHeight } = this.tileMetadata;
        this.visibleTiles = this.getVisibleTiles(offsetX, offsetY, canvasWidth, canvasHeight);

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        this.visibleTiles.forEach(([x, y]) => {
            const tileKey = `${x}_${y}`;
            const img = this.loadedTiles[tileKey];
            if (img) {
                const tileCanvasX = x * tileWidth - offsetX;
                const tileCanvasY = y * tileHeight - offsetY;

                ctx.drawImage(
                    img,
                    tileCanvasX,
                    tileCanvasY,
                    tileWidth,
                    tileHeight
                );
            }
        });
    }
}
