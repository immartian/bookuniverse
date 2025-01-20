import { View } from './View.js';
export class GlobalView extends View {
    constructor(baseCanvas, overlayCanvas) {
        super('Global', baseCanvas, overlayCanvas);
        this.image = new Image();
        this.zoom = 1;
        this.tooltipX = this.tooltipY = 0;
        this.highlighted = "md5";
        this.all_books = [];
        fetch('./all_books.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            this.all_books = data;
        })
        .catch(error => console.error('Error loading all_books.json:', error));
        
        this.image.onload = () => {
            this.drawBase();
        };
    }
    onEnter() {
        console.log('Entering Global View');
        this.startRendering(); // Start the new view's animation
    }

    drawBase() {
        const ctx = this.baseCtx;
        this.image.onload = () => {
            ctx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
            ctx.drawImage(this.image, 0, 0, this.baseCanvas.width, this.baseCanvas.height);
        };
    
        if (this.image.src !== `images/all_isbns_${this.highlighted}_1_50.png`) {
            this.image.src = `images/all_isbns_${this.highlighted}_1_50.png`;
        }    
    }

    drawOverlay() {
        const ctx = this.overlayCtx;
        ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        //this.drawTitle(ctx, 'All Books(32,022,039)');
        // this.draw_map_thumbnail(ctx);
        this.drawLabels();
        this.drawMapScale(ctx, "5000 📚")
    }

 
    handleHover(data) {
        // Check if mouse is over a label
        const x = data.x;
        const y = data.y;
        const rect = this.baseCanvas.getBoundingClientRect();

        this.tooltipX =  data.x + rect.left;
        this.tooltipY =  data.y + rect.top;

        this.highlighted =  this.all_books.find(label => 
            x >= label.x && x <= label.x + label.width &&
            y >= label.y - label.height && y <= label.y
        )?.prefix;
        if (!this.highlighted) this.highlighted = "md5";
        this.image.src = `images/all_isbns_${this.highlighted || 'md5'}_1_50.png`;

    }
    
    // Draw labels on the canvas
    drawLabels() {
        const overlayCtx = this.overlayCtx;

        // arrange daataset positions and colors, "All books" and "Annas-Arive" are at first line(near middle of the canvas) next to each other based on count's text length, "All books" is in red and "Annas-Archive" is in green
        // all other dataset are in the second line next to each other with different colors, if the line is going to overflow, add one more line below with same linespace
        const startX = 20, startY = 560;
        const linespace =  40;
        overlayCtx.font = "16px Arial";
        const height = 16;
        const maxWidth = overlayCanvas.width - 40; // Maximum width for labels in a line

        // Compute the position of each label
        let x, y; 
        this.all_books.forEach((dataset, index) => {
            
            let x = index < 2 ? (index === 0 ? 20 : this.all_books[index - 1].x + this.all_books[index - 1].width + 20) : (index === 2 ? startX : this.all_books[index - 1].x + this.all_books[index - 1].width + 20);

            if (index < 2) {
                y = startY;
            } else if (index ===2)
            {
                y = this.all_books[0].y +linespace;
            } else {
                y = this.all_books[index-1].y;
            }
            // get count in thougands comma separated
            const count = dataset.count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            let text = index <2 ? dataset.name + "(" + count + ")": dataset.name; 
            const width = overlayCtx.measureText(text).width;

            // Check if the label overflows the canvas width
            if (x + width > maxWidth) {
                y = this.all_books[index-1].y +linespace; // Move to the next line
                x = startX; // Reset startX for the new line
            }

            dataset.x = x;
            dataset.y = y;
            dataset.width = width;
            dataset.height = height;

            overlayCtx.fillStyle = index < 2 ? dataset.color : "rgb(40, 40, 40)";  // Set background color
            if (this.highlighted) {
                if (this.highlighted === dataset.prefix) {
                    if (index!= 0) overlayCtx.fillStyle =  "green" // ignore dataset color to prevent busy
                    // show tooltip of counts, near mouse cursor 
                    if (index !=1) 
                        this.tooltip.show(count, this.tooltipX, this.tooltipY);
                    else 
                        this.tooltip.hide();
                }
                else if (index ===1) overlayCtx.fillStyle = "rgb(40, 40, 40)";
                
            }
            overlayCtx.fillRect(dataset.x, dataset.y - 16, dataset.width+10, dataset.height+5);
            
            overlayCtx.fillStyle = "gray";
            if (index <2) overlayCtx.fillStyle = "lightgray";
            if (this.highlighted && this.highlighted === dataset.prefix) {
                overlayCtx.fillStyle = "white";
            }
            overlayCtx.fillText(text, dataset.x+5, dataset.y);

            
        });
    }

}