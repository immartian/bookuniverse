import { ISBN } from "./ISBN.js";
import { Tooltip } from "./Tooltip.js";
export class View {
    constructor(name, baseCanvas, overlayCanvas, scale) {
        this.name = name;
        this.ISBN = new ISBN();
        this.isbnIndex = 0;
        this.isbn_color = 'black';
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

    drawISBN() {
        // draw current isbn on screen at the right bottom corner
        const ctx = this.overlayCtx;
        ctx.fillStyle = this.isbn_color;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(this.overlayCanvas.width - 400, this.overlayCanvas.height - 40, 190, 30);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(`ISBN: ${this.ISBN.calculateISBN(this.isbnIndex, true)}`, this.overlayCanvas.width - 380, this.overlayCanvas.height - 20);
        ctx.globalAlpha = 1;
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
        const map_x = Math.floor(offsetX / 50000 * width *scale) + x;
        const map_y = Math.floor(offsetY / 40000 * height*scale) + y;
        ctx.fillRect(map_x, map_y, Math.max(4, 2*scale), Math.max(4, 2*Math.round(0.75*scale)));

    }

    drawMapScale(ctx, text, x=null, y=null, length=100) {
        // default set to right bottom corner
        if (x === null)
            x = this.overlayCanvas.width - 110;
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

    zoom_effect(data) {
        return new Promise((resolve) => {
            if (this.zooming) {
                return;
            }
            this.zooming = true;
    
            let { x, y } = data;  // Mouse position
            const targetZoom = 5;  // Target zoom level for next view
            const smoothFactor = 0.5;  // Controls the speed of zooming
    
            // Convert mouse position to global ISBN position
            const globalX = x  ;
            const globalY = y ;
    
            // Calculate the initial and target offsets to ensure smooth zooming centered on the cursor
            let targetOffsetX = globalX - (this.baseCanvas.width / 2 / targetZoom);
            let targetOffsetY = globalY - (this.baseCanvas.height / 2 / targetZoom);
    
            const animateZoom = () => {
                if (Math.abs(this.zoom - targetZoom) > 0.01) {
                    this.zoom +=  smoothFactor;
                    this.clearCanvas();
    
                    // // Smooth transition of offsets
                    // let currentOffsetX = startOffsetX + (targetOffsetX - startOffsetX) * (this.zoom / targetZoom);
                    // let currentOffsetY = startOffsetY + (targetOffsetY - startOffsetY) * (this.zoom / targetZoom);
    
                    // Apply transformation to zoom into the cursor position
                    this.baseCtx.setTransform(this.zoom, 0, 0, this.zoom, -targetOffsetX * this.zoom, -targetOffsetY * this.zoom);
                    
                    this.baseCtx.drawImage(this.image, 0, 0, this.baseCanvas.width, this.baseCanvas.height);
    
                    requestAnimationFrame(animateZoom);
                } else {
                    this.zoom = 1;  // Lock final zoom level
                    this.zooming = false;  // Reset flag
                    resolve();  // Resolve the promise after completion
                }
            };
    
            animateZoom();
        });
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
