export class TileManager {
    constructor(tileMetadata) {
        this.tileMetadata = tileMetadata;
        this.loadedTiles = {}; // Cache for individual tiles
    }

    async loadTile(x, y, tileData) {
        return new Promise((resolve, reject) => {
            const tileKey = `${x}_${y}`;
            const img = new Image();
            img.src = `${tileData.tileDir}/tile_${tileKey}.png`;

            img.onload = () => {
                this.loadedTiles[tileKey] = img;
                resolve();
            };
            img.onerror = () => reject(`Failed to load tile at (${x}, ${y})`);
        });
    }

    async loadVisibleTiles(tileData, offsetX, offsetY, canvasWidth, canvasHeight) {
        const visibleTiles = this.getVisibleTiles(tileData, offsetX, offsetY, canvasWidth, canvasHeight);
        const loadPromises = visibleTiles.map(([x, y]) => {
            const tileKey = `${x}_${y}`;
            if (!this.loadedTiles[tileKey]) {
                return this.loadTile(x, y, tileData);
            }
            return Promise.resolve();
        });

        // **Wait for all tiles to load before rendering**
        await Promise.all(loadPromises);
    }

    getVisibleTiles(tileData, offsetX, offsetY, canvasWidth, canvasHeight) {
        const { tileWidth, tileHeight, gridWidth, gridHeight } = tileData;

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

    async draw(ctx, offsetX, offsetY, canvasWidth, canvasHeight, zoom) {
        const bestScale = this.getBestScale(zoom);
        const tileData = this.tileMetadata[bestScale];

        if (!tileData.grid) {
            // **Single Image Mode**
            if (!this.loadedTiles[bestScale]) {
                const img = new Image();
                img.src = tileData.src;
                await new Promise((resolve) => {
                    img.onload = () => {
                        this.loadedTiles[bestScale] = img;
                        resolve();
                    };
                });
            }

            const img = this.loadedTiles[bestScale];
            if (img) {

                ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY);
                ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            }
        } else {
            // **Grid Tile Mode**
            await this.loadVisibleTiles(tileData, -offsetX, -offsetY, canvasWidth, canvasHeight);

            // **Clear the canvas only after all tiles are loaded**
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);

            const { tileWidth, tileHeight } = tileData;
            this.getVisibleTiles(tileData, -offsetX, -offsetY, canvasWidth, canvasHeight).forEach(([x, y]) => {
                const tileKey = `${x}_${y}`;
                const img = this.loadedTiles[tileKey];
                ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY);

                if (img) {
                    // **Correct scaling transformation for grid tiles**
                    const tileCanvasX = (x * tileWidth - offsetX) * (zoom / bestScale);
                    const tileCanvasY = (y * tileHeight - offsetY) * (zoom / bestScale);
                    const drawWidth = tileWidth * (zoom / bestScale);
                    const drawHeight = tileHeight * (zoom / bestScale);

                    ctx.drawImage(img, tileCanvasX, tileCanvasY, drawWidth, drawHeight);
                }
            });

        }
    }

    getBestScale(zoom) {
        return Object.keys(this.tileMetadata)
            .map(Number)
            .reduce((prev, curr) => (Math.abs(curr - zoom) < Math.abs(prev - zoom) ? curr : prev));
    }
}
