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
        await Promise.all(loadPromises);
    }

    getVisibleTiles(tileData, offsetX, offsetY, canvasWidth, canvasHeight) {
        const { tileWidth, tileHeight, gridWidth, gridHeight } = tileData;

        // Calculate which tiles are visible
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

    getBestScale(zoomLevel) {
        // Sort available scales and find the closest one to zoomLevel
        return Object.keys(this.tileMetadata)
            .map(Number)
            .reduce((prev, curr) => (Math.abs(curr - zoomLevel) < Math.abs(prev - zoomLevel) ? curr : prev));
    }

    async draw(ctx, offsetX, offsetY, canvasWidth, canvasHeight, zoomFactor) {
        const selectedResolution = this.getBestScale(zoomFactor); // Closest resolution to zoom level
        const tileData = this.tileMetadata[selectedResolution];
        ctx.imageSmoothingEnabled = false;
    
        if (offsetX === 0 && offsetY === 0 && zoomFactor === 1) { offsetX = 0; offsetY = 0; }
    
        // draw image or tiles
        if (!tileData.grid) {
            if (!this.loadedTiles[selectedResolution]) {
                const img = new Image();
                img.src = tileData.src;
                await new Promise((resolve) => {
                    img.onload = () => {
                        this.loadedTiles[selectedResolution] = img;
                        resolve();
                    };
                });
            }
            const img = this.loadedTiles[selectedResolution];
            if (img) {
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                ctx.setTransform(zoomFactor, 0, 0, zoomFactor, offsetX, offsetY);
                ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            }
        } 
        else {   /// draw tiles
            const { scale, tileWidth, tileHeight } = tileData;
            //calcuate required tiles from offset, scale and canvas size
            const scaleFactor = zoomFactor/scale;
            // console.log("scaleFactor: ", scaleFactor);
            const adjustedOffsetX = Math.max(0, (- offsetX)/scaleFactor);
            const adjustedOffsetY = Math.max(0, (- offsetY)/scaleFactor);
            await this.loadVisibleTiles(tileData, adjustedOffsetX, adjustedOffsetY, canvasWidth, canvasHeight);
            
            // console.log("adjustedOffsetX: ", adjustedOffsetX, "adjustedOffsetY: ", adjustedOffsetY);

            const tilesReady = this.getVisibleTiles(tileData, adjustedOffsetX, adjustedOffsetY, canvasWidth, canvasHeight)
                .every(([x, y]) => this.loadedTiles[`${x}_${y}`]);
    
            if (tilesReady) {
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            }
        
            ctx.setTransform(scaleFactor, 0, 0, scaleFactor, offsetX, offsetY);
    
            this.getVisibleTiles(tileData, adjustedOffsetX, adjustedOffsetY, canvasWidth, canvasHeight).forEach(([x, y]) => {
                const tileKey = `${x}_${y}`;
                const img = this.loadedTiles[tileKey];
                if (img) {
                    const tileCanvasX = x * tileWidth;
                    const tileCanvasY = y * tileHeight;
                    ctx.drawImage(img, tileCanvasX,tileCanvasY, tileWidth, tileHeight);
                    // debug, draw the text of the tileKey in the center of this tile
                    // ctx.fillStyle = 'white';
                    // ctx.font = '20px Arial';
                    // ctx.fillText(tileKey, tileCanvasX + tileWidth / 2, tileCanvasY + tileHeight / 2);

                }
            });
        }
        // reset transformation matrix
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    
    
}
