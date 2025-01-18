import { View } from './View.js';
export class GlobalView extends View {
    constructor(baseCanvas, overlayCanvas, tooltip) {
        super('Global', baseCanvas, overlayCanvas);
        this.tooltip = tooltip;
        this.image = new Image();
        this.scale = 1;
        this.image.src = 'images/global_view.png'; 
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
        ctx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
        ctx.drawImage(this.image, 0, 0, this.baseCanvas.width, this.baseCanvas.height);
    }

    drawOverlay() {
        const ctx = this.overlayCtx;
        ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        //this.drawTitle(ctx, 'All Books(32,022,039)');
        // this.draw_map_thumbnail(ctx);
        this.drawMapScale(ctx, "5000 📚")

    }

    zoom(data, ZOOM_FACTOR = 1) {
        const ctx = this.baseCtx;
        // setTranform effect from current mouse position 
        let offsetX = 0; // Translation offset in X
        let offsetY = 0; // Translation offset in Y

        // Update scale level
        this.scale += ZOOM_FACTOR;
        // Update translation
        const x = data.x;
        const y = data.y;

        offsetX = (offsetX - x) * (ZOOM_FACTOR - 1);
        offsetY = (offsetY - y) * (ZOOM_FACTOR - 1);
        
        // Apply the transformation
        console.log('mockup zooming in', this.scale, offsetX, offsetY);
        ctx.scale(this.scale, this.scale);
        ctx.translate(offsetX, offsetY);

        // console.log('Zooming in', this.scale, offsetX, offsetY);    
        // // Apply transformations
        // ctx.setTransform(this.scale, 0, 0, this.scale, offsetX, offsetY);

        // // Redraw the image
        // ctx.drawImage(this.image, 0, 0, mainCanvas.width, mainCanvas.height);

        // // Reset transformations for next operations
        // ctx.setTransform(1, 0, 0, 1, 0, 0);

    }
 
    handleHover({ x, y }) {
        const region = this.getRegionFromCoordinates(x, y);
        if (region) {
            this.tooltip.show(`Region: ${region}`, x, y);
        } else {
            this.tooltip.hide();
        }
    }

    getRegionFromCoordinates(x, y) {
        // Placeholder logic for detecting regions. Replace with real logic.
        if (x > 200 && x < 400 && y > 300 && y < 500) {
            return 'Sample Region';
        }
        return null;
    }
}