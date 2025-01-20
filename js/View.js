import { ISBN } from "./ISBN.js";
import { Tooltip } from "./Tooltip.js";
export class View {
    constructor(name, baseCanvas, overlayCanvas, scale) {
        this.name = name;
        this.ISBN = new ISBN();
        this.scale = scale; 
        this.zoom = 1; 
        this.baseCanvas = baseCanvas;
        this.overlayCanvas = overlayCanvas;
        this.baseCtx = baseCanvas.getContext('2d');
        this.overlayCtx = overlayCanvas.getContext('2d');
        this.tooltip = new Tooltip();
        
        this.animationFrameId = null; // To track the requestAnimationFrame ID
    }

    onEnter(options = {}) {
        console.log(`${this.name} view entered`, options);
    }

    onExit() {
        console.log(`highlevel: Exiting ${this.name} View`);
        this.stopRendering(); 
        this.clearCanvas();
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
}
