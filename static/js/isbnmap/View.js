import { TileManager } from './TileManager.js';
import { ISBN } from './ISBN.js';
import { Tooltip } from './Tooltip.js';
import { RarebookManager } from './RarebookManager.js';


export class View {
    constructor(baseCanvas, overlayCanvas, tileMetadata) {
        this.baseCanvas = baseCanvas;
        this.baseCtx = baseCanvas.getContext('2d');
        this.overlayCanvas = overlayCanvas;
        this.overlayCtx = overlayCanvas.getContext('2d');

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

        this.tooltip = new Tooltip();
        this.iconWidth = 20;
        this.iconHeight = 20;
        this.rarebooks = [];
        this.tooltipX = 0;
        this.tooltipY = 0;
        this.rarebookManager = new RarebookManager();

        this.all_books = [];
        fetch('./static/data/all_books.json')
            .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
            })
            .then(data => {
            this.all_books = data;
            })

        this.addEventListeners(this.overlayCanvas);   // we can swtich to overlayCanvas
        this.resetView();
    };

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
        
        this.drawOverlay();
       // if (this.zoom <= this.minZoom) { if (!this.e) this.e = this.de(ctx); } else if (this.e) { this.e(); this.e = null; }    
    }

    drawOverlay() {
        const ctx = this.overlayCtx;
        this.drawRarebooksInView(ctx);
        // this.drawDebug(ctx, this.zoom.toFixed(2) + ' ' + this.offsetX + ' ' + this.offsetY);
        // draw countries
        this.drawCountries(ctx);  
        this.drawISBN(ctx);
        this.drawMapScaleIndicator(ctx);
        this.drawOverview();
    }

/////////////////////////////////////////////////////////////////////////////////////////////////
                                // Sub-Drawing functions //
/////////////////////////////////////////////////////////////////////////////////////////////////

    drawDebug(ctx, anything) {
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(`Zoom: ${anything}`, 10, this.baseCanvas.height- 30 );   
    }

    de(ctx) { let w = this.baseCanvas.width, h = this.baseCanvas.height, x = this.offsetX, y = this.offsetY, vx = (Math.random() - 0.5) * 5, vy = (Math.random() - 0.5) * 5, e = '📕', r = true, c = () => e = Math.random() > 0.5 ? '📕' : '📗', a = () => { if (!r) {return}; this.offsetX=x+20; this.offsetY=y-40;  x += vx; y += vy; (x <= 0 || x >= w - 24) && (vx *= -1, c()); (y <= 0 || y >= h - 24) && (vy *= -1, c()); ctx.font = '48px Arial'; ctx.fillText(e, x, y); requestAnimationFrame(a); }; a(); return () => r = false; }

    drawCountries(ctx) {
        // draw countries 
        this.countriesInView = this.getCountriesInView();
        // console.log("countriesInView: ", countriesInView);
        this.countriesInView.forEach(({ country, startRow, endRow, startCol, endCol }) => {
            const clampedStartRow = Math.max(0, startRow + this.offsetY);
            const clampedStartCol = Math.max(0, startCol + this.offsetX);
            const clampedEndRow = Math.min(this.overlayCanvas.height, endRow + this.offsetY);
            const clampedEndCol = Math.min(this.overlayCanvas.width, endCol + this.offsetX);
            // console.log("Debug: ", country,  startRow, endRow, startCol, endCol);
            // if (country === "English language 🇬🇧🇺🇸🇨🇦🇦🇺🇳🇿🇿🇦" ) console.log("Debug: clampedStartRow:", clampedStartRow, "clampedEndRow:", clampedEndRow, "clampedStartCol:", clampedStartCol, "clampedEndCol:", clampedEndCol, "startRow:", startRow, "endRow:", endRow, "startCol:", startCol, "endCol:", endCol);            
            // if (country === "Japan 🇯🇵") console.log("Debug: clampedStartRow:", clampedStartRow, "clampedEndRow:", clampedEndRow, "clampedStartCol:", clampedStartCol, "clampedEndCol:", clampedEndCol, "startRow:", startRow, "endRow:", endRow, "startCol:", startCol, "endCol:", endCol);
            const height = clampedEndRow-clampedStartRow;
            // const width = clampedEndCol - clampedStartCol;
            if (height > 2) {          //ignore small countries for now
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = 'lightgray';
                let font_size = Math.min(40, Math.log10(this.zoom*4+1)*height/2);
                if (this.zoom >900 && height < 4) font_size = Math.max(20, font_size);
                // draw a rectange mask over the region
                if (country === this.highlightedZone?.country && this.countriesInView.length > 1) {
                    if (! (this.countriesInView.length === 2 && country === "English language 🇬🇧🇺🇸🇨🇦🇦🇺🇳🇿🇿🇦")) {
                    //skip this case 
                        if (height>2){
                            ctx.globalAlpha = 0.3;
                            ctx.fillStyle = 'gray';
                        } else {
                            ctx.globalAlpha = 0.5;
                            ctx.fillStyle = 'yellow';
                        }
                        // here's a bug, the width should be the min of canvas width and right border of view
                        ctx.fillRect(clampedStartCol, clampedStartRow, clampedEndCol-clampedStartCol, clampedEndRow-clampedStartRow);
                        
                        ctx.fillStyle = 'yellow';
                        ctx.globalAlpha = 1;
                        font_size *= 1.1; 
                    }
                }
                // center the text
                ctx.textAlign = 'center';
                ctx.font = `${font_size}px Arial`;
                //Math.max(this.baseCanvas.width/3,(this.baseCanvas.width+this.offsetX)/2)   //optimal x position
                ctx.fillText(country, (clampedStartCol +clampedEndCol)/2, (clampedEndRow+clampedStartRow)/2);
            }
            ctx.textAlign = 'start';
            ctx.globalAlpha = 1;
                
        });

    }

    drawOverview() {
        
        const ctx = this.baseCtx;
        if (this.zoom < 1)  ctx.globalAlpha = Math.log10(this);
        let font_size = Math.log(this.zoom*4 + 1)*10;
        ctx.font = `${font_size}px Arial`;
        if (this.zoom < 0.9) return ;
        // make height a dynamic value like font size
        const height = font_size;
        // redefine startX and startY based on the zoom and offsets
        const startX = 150 *  this.zoom + this.offsetX;
        const startY = 500 * this.zoom + this.offsetY;
        
        const linespace = font_size *2 ; // Space between lines
        const maxWidth = this.baseCanvas.width +this.offsetX- 40; // Maximum width for labels in a line

        // Compute the position of each label
        let x, y;

        this.all_books.forEach((dataset, index) => {
            x = index < 2 ? (index === 0 ? startX : this.all_books[index - 1].x + this.all_books[index - 1].width + 20) : (index === 2 ? startX : this.all_books[index - 1].x + this.all_books[index - 1].width + 20);

            if (index < 2) {
            y = startY;
            } else if (index === 2) {
            y = this.all_books[0].y + 2* linespace;
            } else {
            y = this.all_books[index - 1].y;
            }
            // get count in thousands comma separated
            const count = dataset.count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            let text = dataset.name + " (" + count + " 📚)" ;
            const width = this.baseCtx.measureText(text).width;

            // Check if the label overflows the canvas width
            if (x + width > maxWidth) {
            y = this.all_books[index - 1].y + linespace; // Move to the next line
            x = startX; // Reset startX for the new line
            }

            dataset.x = x;
            dataset.y = y;
            dataset.width = width;
            dataset.height = height;

            ctx.fillStyle = index < 2 ? dataset.color : "rgb(40, 40, 40)";  // Set background color

            ctx.fillRect(dataset.x, dataset.y - 16, dataset.width + 10, dataset.height + 5);

            ctx.fillStyle = "gray";
            if (index < 2) ctx.fillStyle = "lightgray";

            ctx.fillText(text, dataset.x + 5, dataset.y);
        });
        ctx.globalAlpha= 1;
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



    drawRarebooksInView(ctx) {
            // try to draw books
        ctx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);

        if (this.zoom > 800) {
        //     this.imageData = ctx.getImageData(
        //         0,
        //         0,
        //         this.baseCanvas.width,
        //         this.baseCanvas.height
        //     );        
        //     const total_cols =  Math.ceil(this.baseCanvas.width / this.iconWidth); 
        //     const total_rows  = Math.ceil(this.baseCanvas.height / this.iconHeight); 

        //     const pixels = this.imageData.data;
        
        //     for (let row = 0; row < total_rows; row++) {
        //         for (let col = 0; col < total_cols; col++) {
        //             const x = col * this.iconWidth - (this.offsetX % this.iconWidth);
        //             const y = row * this.iconHeight - (this.offsetY % this.iconHeight);
        
        //             const pixelIndex = (row * this.baseCanvas.width + col) * 4;

        
        //             const r = pixels[pixelIndex];
        //             const g = pixels[pixelIndex + 1];
        //             const b = pixels[pixelIndex + 2];
        
        //             let bookIcon = '';
        //             if (r > 200 && g < 100 && b < 100) {
        //                 bookIcon = '📕';  // Red - Absent book
        //             } else if (g > 200 && r < 100 && b < 100) {
        //                 bookIcon = '📗';  // Green - Available book
        //             } else {
        //                 continue;
        //             }
        
        //             ctx.font = `${this.iconWidth}px Arial`;
        //             ctx.fillText(bookIcon, x, y + this.iconHeight);
        //         }
        //     }

        // }
        const scaleFactor = this.zoom/50;

        const adjustedOffsetX = Math.floor(Math.max(0, (- this.offsetX))/scaleFactor);
        const adjustedOffsetY = Math.floor(Math.max(0, (- this.offsetY))/scaleFactor);    
        this.rarebookManager.loadVisibleTiles(adjustedOffsetX, adjustedOffsetY, this.baseCanvas.width, this.baseCanvas.height);
        this.rarebooks = this.rarebookManager.getRareBooksInView(adjustedOffsetX, adjustedOffsetY, this.baseCanvas.width, this.baseCanvas.height);
        this.rarebooks.forEach(book => {
            // // Convert ISBN index to row and column based on the current zoom level(default 1000
            const iconX = (book.x*this.iconWidth +this.offsetX) ;
            const iconY = (book.y*this.iconHeight + this.offsetY);
            // ({x: book.x, y: book.y} = this.calculateBookPosition(book.i));
            // const iconX =  (book.x- adjustedOffsetX)/scaleFactor*this.iconWidth/// (book.x- adjustedOffsetX)/scaleFactor*this.iconWidth - (adjustedOffsetX/scaleFactor % this.iconWidth); 
            // const iconY = (book.y - adjustedOffsetY)/scaleFactor*this.iconHeight  //- (adjustedOffsetY/scaleFactor % this.iconHeight);;
            //   // // Ensure the book is within the visible viewport
            if (iconX >= 0 && iconX < this.baseCanvas.width && iconY >= 0 && iconY < this.baseCanvas.height) {
            ctx.font = '20px Arial';
            ctx.fillText(book.e ? "⭐" : "⭐", iconX , iconY + 15);
            }
        });
        }
    }

    // country related functions
    getZoneRange(prefix) { 
        const startISBN = this.ISBN.padToISBN(prefix, "0");
        const endISBN = this.ISBN.padToISBN(prefix, "9");
        // const startRow = Math.floor((startISBN - this.baseISBN) / 50000;
        // const endRow = Math.floor((endISBN - this.baseISBN) / 50000;

        let startRow, endRow;  
        let startCol = 0, endCol = this.baseCanvas.width
        const ratio = this.zoom/50;
        const global_scale = 50000/ratio;
        /// special case for 978-0 and 978-1 
        if (prefix === "9780" || prefix === "9781") {
            const startISBN = this.ISBN.padToISBN("978-0", "0");
            const endISBN = this.ISBN.padToISBN("978-1", "9");
            startRow = Math.floor((startISBN - this.ISBN.baseISBN) / global_scale);
            endRow = Math.floor((endISBN - this.ISBN.baseISBN) /global_scale);
            startCol = Math.floor(startISBN % 50000*ratio);
            endCol =  Math.floor(endISBN  %  50000*ratio);
        }
        else
        {
            startRow = Math.floor((startISBN - this.ISBN.baseISBN) / global_scale);
            endRow = Math.floor((endISBN - this.ISBN.baseISBN) / global_scale);
            // there are some small countries that won't cover a full row
            // so we need to adjust the start and end columns
            startCol = Math.floor(startISBN % 50000*ratio);
            endCol =  Math.floor(endISBN  %  50000*ratio);
        }
        // if (prefix === "97899923") {
        //     console.log("Debug: ", startISBN, endISBN, startRow, endRow, startCol, endCol, this.zoom, this.ISBN.baseISBN);
        // }
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





































/////////////////////////////////////////////////////////////////////////////////
                            //interactions//

/////////////////////////////////////////////////////////////////////////////////


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
        // if (Math.abs(this.zoom - 1) < 0.05) {
        //     this.resetView();
        //     return ;
        // }   // not a good experience, just double click at smaller view would be good enough
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

            // check rare books in view
            const isbn = this.ISBN.calculateISBN(this.isbnIndex, true);
     
            // find a rare book matching current isbn under mouse
            const found_book = this.rarebooks.find(function(book) {
                return book.i === isbn;
              });
                          
             // Show the ISBN number in the tooltip
            this.tooltip.x = event.clientX;
            this.tooltip.y = event.clientY;
    
            if (found_book) {
                    // Show the book's title and number of holdings in the tooltip
                    
                    const title = found_book.t;
                    const holdings = found_book.h;
                
    
                        // show the isbn cover image in tooltip
                        const isbn13 = found_book.i;  //this.ISBN.calculateISBN(this.isbnIndex, true);
                        const part1 = String(isbn13).slice(-4, -2);
                        const part2 = String(isbn13).slice(-2);
                                        // Image URL pattern
                        const imageUrl = `https://images.isbndb.com/covers/${part1}/${part2}/${isbn13}.jpg`;
        
                        // make a tooltip with the bookcard style
                        const innerHTML = "<div class='book-card'><img src='"+imageUrl+"' alt='Book Cover' class='book-cover'>"+
                        "<div class='book-details'>"+
                        "<div class='book-title'>"+title+"</div>"+
                        "<div class='book-isbn'>"+isbn13+"</div>"+
                        "<div class='book-copies'>"+
                        "<span> Copies: "+( holdings + (found_book.e ? '<br>📗 In Annas-Archive' : '<br>📕 Not in Annas-Archive') )+"</span>"+ 
                        // (exist ? 'Rare' : 'Not Rare')+
                        "</div>"+
                        "</div>";
                        this.tooltip.show(innerHTML);
        
                }
                else
                this.tooltip.hide(); 
                //     this.tooltip.show("ISBN: "+ isbn + "<br> Double click to search in Annas-Archive");

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
        // open the search page for the current isbn under mouse, or just zoom to the 1:1 view
        if (this.zoom <1){   
            this.resetView();
        }
        else{
            const isbn13 = this.ISBN.calculateISBN(this.isbnIndex, true);
            console.log("isbn: ", isbn13);
            // search in Anna's Archive 
            const searchUrl = `https://annas-archive.org/search?index=meta&q=${isbn13}`;
            window.open(searchUrl, "_blank");
        }
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

    addEventListeners(canvas) {
        canvas.addEventListener('wheel', (event) => this.handleWheel(event));
        canvas.addEventListener('mousedown', (event) => this.handleMouseDown(event));
        canvas.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        canvas.addEventListener('mouseup', () => this.handleMouseUp());
        canvas.addEventListener('mouseleave', () => this.handleMouseUp());
        canvas.addEventListener('dblclick', (event) => this.handleDoubleClick(event));

        canvas.addEventListener('touchstart', (event) => this.handleTouchStart(event));
        canvas.addEventListener('touchmove', (event) => this.handleTouchMove(event));
        canvas.addEventListener('touchend', () => this.handleTouchEnd()); 
    }
}