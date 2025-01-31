import { TileManager } from './TileManager.js';
import { ISBN } from './ISBN.js';

export class View {
    constructor(baseCanvas, overlayCanvas, tileMetadata) {
        this.baseCanvas = baseCanvas;
        this.baseCtx = baseCanvas.getContext('2d');

        this.zoom = 1;
        this.minZoom = 0.1;
        this.maxZoom = 1000;
        this.scaleFactor = 1.1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.snapThreshold = 50;
        this.tileManager = new TileManager(tileMetadata);

        this.ISBN = new ISBN();
        this.isbnIndex = 0;
        this.countriesInView = [];

        this.addEventListeners();
        this.resetView();
    }

    async resetView() {
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        await this.tileManager.loadVisibleTiles(this.offsetX, this.offsetY, this.baseCanvas.width, this.baseCanvas.height, this.zoom);
        this.draw();
    }

    async draw() {
        const ctx = this.baseCtx;
        ctx.imageSmoothingEnabled = false;
        await this.tileManager.draw(ctx, this.offsetX, this.offsetY, this.baseCanvas.width, this.baseCanvas.height, this.zoom);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // draw countries
        this.drawCountry(ctx);
        // draw debug 
        this.drawDebug(ctx, this.zoom.toFixed(2) + ' ' + this.offsetX + ' ' + this.offsetY);
        this.drawISBN(ctx);
        this.drawMapScaleIndicator(ctx);

        // if (this.zoom <= this.minZoom) { if (!this.e) this.e = this.de(ctx); } else if (this.e) { this.e(); this.e = null; }    
    }

    drawDebug(ctx, anything) {
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(`Zoom: ${anything}`, 10, this.baseCanvas.height- 30 );   
    }

    de(ctx) { let w = this.baseCanvas.width, h = this.baseCanvas.height, x = this.offsetX, y = this.offsetY, vx = (Math.random() - 0.5) * 5, vy = (Math.random() - 0.5) * 5, e = '📕', r = true, c = () => e = Math.random() > 0.5 ? '📕' : '📗', a = () => { if (!r) {return}; this.offsetX=x+20; this.offsetY=y-40;  x += vx; y += vy; (x <= 0 || x >= w - 24) && (vx *= -1, c()); (y <= 0 || y >= h - 24) && (vy *= -1, c()); ctx.font = '48px Arial'; ctx.fillText(e, x, y); requestAnimationFrame(a); }; a(); return () => r = false; }


    drawCountry(ctx) {
        // draw countries 
        this.countriesInView = this.getCountriesInView();
        // console.log("countriesInView: ", countriesInView);
        this.countriesInView.forEach(({ country, startRow, endRow, startCol, endCol }) => {
            const height = endRow - startRow;
            // const width = clampedEndCol - clampedStartCol;
            if (height > 7) {          //ignore small countries for now
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = 'lightgray';
                if (country === this.highlightedZone?.country) {
                    ctx.fillStyle = 'yellow';
                    ctx.globalAlpha = 1;
                }
                // center the text
                ctx.textAlign = 'center';
                const font_size = Math.min(60, Math.log10(this.zoom*2+1)*height/2);
                ctx.font = `${font_size}px Arial`;
                ctx.fillText(country, Math.max(this.baseCanvas.width/3,(this.baseCanvas.width+this.offsetX)/2), (endRow+startRow)/2+ this.offsetY );
            }
            ctx.textAlign = 'start';
            ctx.globalAlpha = 1;
                
        });

        if (this.highlightedZone && this.countriesInView.length > 1) {
            // draw a rectange mask over the region
            const { startRow, endRow, startCol, endCol, country } = this.highlightedZone;
            const clampedStartRow = Math.max(0, startRow - this.offsetY);
            const clampedEndRow = Math.min(this.baseCanvas.height, endRow - this.offsetY);
            const height = endRow - startRow;
            if (height>2){
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = 'gray';
            } else {
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = 'yellow';
            }
            ctx.fillRect(0, startRow+ this.offsetY, this.baseCanvas.width, height);
            ctx.globalAlpha = 1;
        }

    }

    drawISBN(ctx) {
        // draw current isbn on screen at the right bottom corner
        // // ctx.fillStyle = this.isbn_color;
        // // ctx.globalAlpha = 0.5;
        // ctx.fillRect(this.baseCanvas.width - 400, this.baseCanvas.height - 40, 190, 30);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(`ISBN: ${this.ISBN.calculateISBN(this.isbnIndex, true)}`,this.baseCanvas.width-200, 30);
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

    drawMapScaleIndicator(ctx, x=null, y=null, length=100) {
        // default set to top left corner
        if (x === null)
            x = 10;
        if (y === null)
            y = 30;


        // draw a background with half-transparency
        ctx.fillStyle = 'black';
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x-5, y - 20, length+10, 40);
        ctx.globalAlpha = 1;
        
        // Set up basic styling
        ctx.strokeStyle = 'lightgray'; ctx.fillStyle = 'white'; ctx.lineWidth = 2;
        ctx.font = '14px Arial';

        // Draw horizontal line
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + length, y); ctx.stroke();
        // Draw left vertical bar
        ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5);  ctx.stroke();
        // Draw right vertical bar
        ctx.beginPath();        ctx.moveTo(x + length, y - 5);        ctx.lineTo(x + length, y + 5);        ctx.stroke();
        
        // Add text marker
        const text = `${Math.round(50*100/this.zoom)} 📚`;
        const textWidth = ctx.measureText(text).width;
        ctx.fillText(text, x + (length - textWidth) / 2, y - 8);
    }


    // country related functions
    getZoneRange(prefix) {
        const startISBN = this.ISBN.padToISBN(prefix, "0");
        const endISBN = this.ISBN.padToISBN(prefix, "9");
        // const startRow = Math.floor((startISBN - this.baseISBN) / 50000;
        // const endRow = Math.floor((endISBN - this.baseISBN) / 50000;

        let startRow, endRow;  
        let startCol = 0, endCol = this.baseCanvas.width
        const global_scale = 50000*50/this.zoom;
        /// special case for 978-0 and 978-1 
        if (prefix === "9780" || prefix === "9781") {
            startRow = Math.floor((this.ISBN.padToISBN("978-0", "0") - this.ISBN.baseISBN) / global_scale);
            endRow = Math.floor((this.ISBN.padToISBN("978-1", "9") - this.ISBN.baseISBN) /global_scale);
        }
        else
        {
            startRow = Math.floor((startISBN - this.ISBN.baseISBN) / global_scale);
            endRow = Math.floor((endISBN - this.ISBN.baseISBN) / global_scale);
            // there are some small countries that won't cover a full row
            // so we need to adjust the start and end columns
            startCol = Math.floor((startISBN - this.ISBN.baseISBN) % global_scale);
            endCol = Math.floor((endISBN - this.ISBN.baseISBN) % global_scale);
        }
        return { startRow, endRow, startCol, endCol };
    }

    // Get the countries that are currently in view
    getCountriesInView() {
        const countriesInView = [];
        // const adjustedOffsetX = Math.max(0, (- offsetX)/scaleFactor);
        // const adjustedOffsetY = Math.max(0, (- offsetY)/scaleFactor);
        const visibleStartRow = -this.offsetY;
        const visibleEndRow = -this.offsetY + this.baseCanvas.height;
        
        // console.log ("visibleStartRow: ", visibleStartRow, "visibleEndRow: ", visibleEndRow);
        for (const prefix of this.ISBN.getAllPrefixes()) {
            const cleanPrefix = prefix.replace("-", "");
            const { startRow, endRow, startCol, endCol } = this.getZoneRange(cleanPrefix);
            if (endRow >= visibleStartRow && startRow <= visibleEndRow) {
                const countryData = this.ISBN.getCountryForPrefix(prefix);
                if (countryData) {
                    countriesInView.push({
                        country: countryData,
                        startRow: startRow,
                        endRow: endRow ,
                        startCol: startCol,
                        endCol: endCol,
                    });
                }
            }
        }
        
        return countriesInView;
    }








































    // Add event listeners for zooming and panning
    handleWheel(event) {
        event.preventDefault();
        const { offsetX, offsetY, deltaY } = event;
        const zoomDirection = deltaY < 0 ? this.scaleFactor : 1 / this.scaleFactor;
        const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * zoomDirection));

        // Adjust origin to keep zoom centered on mouse position
        this.offsetX = Math.floor(offsetX - (offsetX - this.offsetX) * (newZoom / this.zoom));
        this.offsetY = Math.floor(offsetY - (offsetY - this.offsetY) * (newZoom / this.zoom));
        this.zoom = newZoom;

        // just if the zoom is very close to 1, reset the view
        if (Math.abs(this.zoom - 1) < 0.05) {
            this.resetView();
            return ;
        }
        this.draw();
    }

    handleMouseDown(event) {
        this.isPanning = true;
        this.lastX = event.clientX;
        this.lastY = event.clientY;
    }

    handleMouseMove(event) {
        const deltaX = event.clientX - this.lastX;
        const deltaY = event.clientY - this.lastY;

        this.lastX = event.clientX;
        this.lastY = event.clientY;
        
        // get the mouse position related to the canvas
        const rect = this.baseCanvas.getBoundingClientRect();

        let x = Math.floor(event.clientX - rect.left) - this.offsetX;
        let y = Math.floor(event.clientY - rect.top) - this.offsetY;        

        if (!this.isPanning){
            // get the proper isbn index with considering the offset and zoom
            this.isbnIndex = Math.floor(x*50/this.zoom) + (Math.floor(y*50/this.zoom)) * 50000;
            // detect if mouse in the region of a country in view
            this.highlightedZone = null;
            // x += this.offsetX; y += this.offsetY;
            for (const { startRow, endRow, startCol, endCol, country } of this.countriesInView) {
                if (y > startRow && y < endRow) {
                    this.highlightedZone = { startRow, endRow, startCol, endCol, country };
                }
            }
        } 
        else{
            this.offsetX += deltaX;
            this.offsetY += deltaY;
        }
        this.draw();
    }

    handleMouseUp() {
        this.isPanning = false;
    }

    handleDoubleClick(event) {
        event.preventDefault();
        const isbn13 = this.ISBN.calculateISBN(this.isbnIndex, true);
        console.log("isbn: ", isbn13);
        // search in Anna's Archive 
        const searchUrl = `https://annas-archive.org/search?index=meta&q=${isbn13}`;
        window.open(searchUrl, "_blank");
    }

    handleTouchStart(event) {
        if (event.touches.length === 2) {
            this.isPinching = true;
            this.startDistance = this.getTouchDistance(event.touches);
            this.startZoom = this.zoom;
        } else if (event.touches.length === 1) {
            this.isPanning = true;
            this.lastX = event.touches[0].clientX;
            this.lastY = event.touches[0].clientY;
        }
    }

    handleTouchMove(event) {
        if (this.isPinching && event.touches.length === 2) {
            event.preventDefault();
            const newDistance = this.getTouchDistance(event.touches);
            const zoomRatio = newDistance / this.startDistance;
            const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.startZoom * zoomRatio));

            // Adjust origin to zoom at midpoint of pinch
            const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
            const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
            this.offsetX = midX - (midX - this.offsetX) * (newZoom / this.zoom);
            this.offsetY = midY - (midY - this.offsetY) * (newZoom / this.zoom);
            this.zoom = newZoom;

            this.draw();
        } else if (this.isPanning && event.touches.length === 1) {
            event.preventDefault();
            const deltaX = event.touches[0].clientX - this.lastX;
            const deltaY = event.touches[0].clientY - this.lastY;
            this.offsetX += deltaX;
            this.offsetY += deltaY;
            this.lastX = event.touches[0].clientX;
            this.lastY = event.touches[0].clientY;

            // Snap to edges
            this.snapToBounds();
            this.draw();
        }
    }

    handleTouchEnd() {
        this.isPinching = false;
        this.isPanning = false;
    }

    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    snapToBounds() {

    }

    addEventListeners() {
        this.baseCanvas.addEventListener('wheel', (event) => this.handleWheel(event));
        this.baseCanvas.addEventListener('mousedown', (event) => this.handleMouseDown(event));
        this.baseCanvas.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        this.baseCanvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.baseCanvas.addEventListener('mouseleave', () => this.handleMouseUp());
        this.baseCanvas.addEventListener('dblclick', (event) => this.handleDoubleClick(event));

        this.baseCanvas.addEventListener('touchstart', (event) => this.handleTouchStart(event));
        this.baseCanvas.addEventListener('touchmove', (event) => this.handleTouchMove(event));
        this.baseCanvas.addEventListener('touchend', () => this.handleTouchEnd());
    }
}