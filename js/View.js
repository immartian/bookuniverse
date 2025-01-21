import { ISBN } from "./ISBN.js";
import { Tooltip } from "./Tooltip.js";
export class View {
    constructor(name, baseCanvas, overlayCanvas, scale) {
        this.name = name;
        this.ISBN = new ISBN();
        this.isbnIndex = 0;
        this.scale = scale; 
        this.scaleWidth = 50000/this.scale;
        this.zoom = 1; 
        this.baseCanvas = baseCanvas;
        this.overlayCanvas = overlayCanvas;
        this.baseCtx = baseCanvas.getContext('2d');
        this.overlayCtx = overlayCanvas.getContext('2d');
        this.tooltip = new Tooltip(); this.tooltipX = this.tooltipY = 0;
        
        this.animationFrameId = null; // To track the requestAnimationFrame ID
    }

    onEnter(options = {}) {
        console.log(`${this.name} view entered`, options);
    }

    onExit() {
        console.log(`highlevel: Exiting ${this.name} View`);
        this.stopRendering(); 
        this.clearCanvas();
        this.tooltip.hide();
    }

    drawBase() {
        console.warn(`${this.name} view: drawBase not implemented`);
    }

    drawOverlay() {
        console.warn(`${this.name} view: drawOverlay not implemented`);
    }

    drawTitle(ctx, text, x=50, y=50) {
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fontWeight = 'bold';
        ctx.fillText(text, x, y);
    }

    draw_map_thumbnail(ctx, scale, offsetX, offsetY) {
        // draw a 100x80 black rectangle with half-transparency, and put and generally at the top right corner
        let x = this.overlayCanvas.width - 110;
        let y = 10;
        const width = 100;
        const height = 80;
        ctx.fillStyle = 'gray';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x, y, width, height);

        // draw a 2x2 yellow rectangle at the position relative to the total map (50000x40000) based on the offsets to this thumbnail box
        ctx.fillStyle = 'yellow';
        ctx.globalAlpha = 1;
        x = Math.floor(offsetX / 50000 * width *scale) + this.overlayCanvas.width - 110;
        y = Math.floor(offsetY / 40000 * height*scale) + 10;
        ctx.fillRect(x, y, Math.max(4, 2*scale), Math.max(4, 2*Math.round(0.75*scale)));

        ctx.globalAlpha = 1;

    }

    drawMapScale(ctx, text, x=null, y=null, length=100) {
        // default set to left bottom corner
        if (x === null)
            x = 20;
        if (y === null)
            y = this.overlayCanvas.height - 20;


        // draw a background with half-transparency
        ctx.fillStyle = 'black';
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x-5, y - 20, length+10, 20);
        ctx.globalAlpha = 1;
        
        // Set up basic styling
        ctx.strokeStyle = 'lightgray';
        ctx.fillStyle = 'lightgray';
        ctx.lineWidth = 2;
        ctx.font = '12px Arial';
        
        // Draw horizontal line
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + length, y);
        ctx.stroke();
        
        // Draw left vertical bar
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x, y + 5);
        ctx.stroke();
        
        // Draw right vertical bar
        ctx.beginPath();
        ctx.moveTo(x + length, y - 5);
        ctx.lineTo(x + length, y + 5);
        ctx.stroke();
        
        // Add text marker
        const textWidth = ctx.measureText(text).width;
        ctx.fillText(text, x + (length - textWidth) / 2, y - 8);
    }

    clearCanvas() {
        this.baseCtx.setTransform(1, 0, 0, 1, 0, 0); // reset transformation
        this.baseCtx.scale(1, 1);  // reset scale
        this.baseCtx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }

    startRendering() {
        if (!this.animationFrameId) {
            const render = () => {
                this.drawBase();
                this.drawOverlay();
                this.animationFrameId = requestAnimationFrame(render); // Save the ID
            };
            render();
        }
    }

    stopRendering() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId); // Cancel the animation frame
            this.animationFrameId = null; // Clear the ID
        }
    }


    zoom_effect(data, ZOOM_FACTOR = 1) {
        this.zoom += ZOOM_FACTOR;
        return 
        const ctx = this.baseCtx;
        // setTranform effect from current mouse position 
        let offsetX = 0; // Translation offset in X
        let offsetY = 0; // Translation offset in Y

        // Update scale level
        // Update translation
        const x = data.x;
        const y = data.y;

        offsetX = (offsetX - x) * (ZOOM_FACTOR - 1);
        offsetY = (offsetY - y) * (ZOOM_FACTOR - 1);
        
        // Apply the transformation
        console.log('mockup zooming in', this.zoom, offsetX, offsetY);
        ctx.scale(this.zoom_effect, this.zoom);
        ctx.translate(offsetX, offsetY);

        // console.log('Zooming in', this.scale, offsetX, offsetY);    
        // // Apply transformations
        // ctx.setTransform(this.scale, 0, 0, this.scale, offsetX, offsetY);

        // // Redraw the image
        // ctx.drawImage(this.image, 0, 0, mainCanvas.width, mainCanvas.height);

        // // Reset transformations for next operations
        // ctx.setTransform(1, 0, 0, 1, 0, 0);

    }

    // Get the countries that are currently in view
    getZoneRange(prefix) {
        const startISBN = this.ISBN.padToISBN(prefix, "0");
        const endISBN = this.ISBN.padToISBN(prefix, "9");
        // const startRow = Math.floor((startISBN - this.baseISBN) / 50000;
        // const endRow = Math.floor((endISBN - this.baseISBN) / 50000;

        let startRow, endRow;  
        let startCol = 0, endCol = this.baseCanvas.width
        /// special case for 978-0 and 978-1 
        if (prefix === "9780" || prefix === "9781") {
            startRow = Math.floor((this.ISBN.padToISBN("978-0", "0") - this.ISBN.baseISBN) / (50000*this.scale));
            endRow = Math.floor((this.ISBN.padToISBN("978-1", "9") - this.ISBN.baseISBN) / (50000*this.scale));
        }
        else
        {
            startRow = Math.floor((startISBN - this.ISBN.baseISBN) / (50000*this.scale));
            endRow = Math.floor((endISBN - this.ISBN.baseISBN) / (50000*this.scale));
            // there are some small countries that won't cover a full row
            // so we need to adjust the start and end columns
            startCol = Math.floor((startISBN - this.ISBN.baseISBN) % (50000*this.scale));
            endCol = Math.floor((endISBN - this.ISBN.baseISBN) % (50000*this.scale));
        }
        return { startRow, endRow, startCol, endCol };
    }

    // Get the countries that are currently in view
    getCountriesInView() {
        const countriesInView = [];
        const visibleStartRow = this.offsetY;
        const visibleEndRow = this.offsetY + this.baseCanvas.height;
        
        for (const prefix of this.ISBN.getAllPrefixes()) {
            const cleanPrefix = prefix.replace("-", "");
            const { startRow, endRow, startCol, endCol } = this.getZoneRange(cleanPrefix);
            if (endRow >= visibleStartRow && startRow <= visibleEndRow) {
                const countryData = this.ISBN.getCountryForPrefix(prefix);
                if (countryData) {
                    countriesInView.push({
                        country: countryData,
                        startRow,
                        endRow,
                        startCol,
                        endCol,
                    });
                }
            }
        }
        
        return countriesInView;
    }

}
