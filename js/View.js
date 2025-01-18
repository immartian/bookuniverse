import { ISBN } from "./ISBN.js";
export class View {
    constructor(name, baseCanvas, overlayCanvas, scale) {
        this.name = name;
        this.ISBN = new ISBN();
        this.scale = scale; 
        this.baseCanvas = baseCanvas;
        this.overlayCanvas = overlayCanvas;
        this.baseCtx = baseCanvas.getContext('2d');
        this.overlayCtx = overlayCanvas.getContext('2d');
    
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

    draw_map_thumbnail(ctx, x=null, y = null, width= null, height=null) {
        // draw a 100x80 black rectangle with half-transparency, and put and generally at the top right corner
        if (x === null)
            x = this.overlayCanvas.width - 110;
        if (y === null)
            y = 10;
        if (width === null)
            width = 100;
        if (height === null)
            height = 80;
        ctx.fillStyle = 'lightgray';
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, width, height);
        
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
}
