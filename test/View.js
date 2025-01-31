import { TileManager } from './TileManager.js';

export class View {
    constructor(baseCanvas, tileMetadata) {
        this.baseCanvas = baseCanvas;
        this.baseCtx = baseCanvas.getContext('2d');

        this.zoom = 1;
        this.minZoom = 0.04;
        this.maxZoom = 50;
        this.scaleFactor = 1.1;
        this.originX = 0;
        this.originY = 0;
        this.snapThreshold = 50;
        this.tileManager = new TileManager(tileMetadata);

        this.addEventListeners();
        this.resetView();
    }

    async resetView() {
        this.zoom = 1;
        this.originX = 0;
        this.originY = 0;
        await this.tileManager.loadVisibleTiles(this.originX, this.originY, this.baseCanvas.width, this.baseCanvas.height, this.zoom);
        this.draw();
    }

    async draw() {
        const ctx = this.baseCtx;
        ctx.imageSmoothingEnabled = false;
        await this.tileManager.draw(ctx, this.originX, this.originY, this.baseCanvas.width, this.baseCanvas.height, this.zoom);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // draw debug 
        this.debugDraw(ctx, this.zoom.toFixed(2) + ' ' + this.originX + ' ' + this.originY);

        if (this.zoom <= this.minZoom) { if (!this.e) this.e = this.de(ctx); } else if (this.e) { this.e(); this.e = null; }    
    }

    debugDraw(ctx, anything) {
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(`Zoom: ${anything}`, 10, 30 );   
    }

    de(ctx) { let w = this.baseCanvas.width, h = this.baseCanvas.height, x = this.originX - 10, y = this.originY + 10, vx = (Math.random() - 0.5) * 5, vy = (Math.random() - 0.5) * 5, e = '📕', r = true, c = () => e = Math.random() > 0.5 ? '📕' : '📗', a = () => { if (!r) {return}; this.originX=x; this.originY=y;  x += vx; y += vy; (x <= 0 || x >= w - 24) && (vx *= -1, c()); (y <= 0 || y >= h - 24) && (vy *= -1, c()); ctx.font = '24px Arial'; ctx.fillText(e, x, y); requestAnimationFrame(a); }; a(); return () => r = false; }

    // Add event listeners for zooming and panning
    handleWheel(event) {
        event.preventDefault();
        const { offsetX, offsetY, deltaY } = event;
        const zoomDirection = deltaY < 0 ? this.scaleFactor : 1 / this.scaleFactor;
        const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * zoomDirection));

        // Adjust origin to keep zoom centered on mouse position
        this.originX = Math.floor(offsetX - (offsetX - this.originX) * (newZoom / this.zoom));
        this.originY = Math.floor(offsetY - (offsetY - this.originY) * (newZoom / this.zoom));
        this.zoom = newZoom;

        this.draw();
    }

    handleMouseDown(event) {
        this.isPanning = true;
        this.lastX = event.clientX;
        this.lastY = event.clientY;
    }

    handleMouseMove(event) {
        if (!this.isPanning) return;

        const deltaX = event.clientX - this.lastX;
        const deltaY = event.clientY - this.lastY;

        this.originX += deltaX;
        this.originY += deltaY;
        this.lastX = event.clientX;
        this.lastY = event.clientY;

        // Snap to edges if close to borders
        this.snapToBounds();

        this.draw();
    }

    handleMouseUp() {
        this.isPanning = false;
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
            this.originX = midX - (midX - this.originX) * (newZoom / this.zoom);
            this.originY = midY - (midY - this.originY) * (newZoom / this.zoom);
            this.zoom = newZoom;

            this.draw();
        } else if (this.isPanning && event.touches.length === 1) {
            event.preventDefault();
            const deltaX = event.touches[0].clientX - this.lastX;
            const deltaY = event.touches[0].clientY - this.lastY;
            this.originX += deltaX;
            this.originY += deltaY;
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

        this.baseCanvas.addEventListener('touchstart', (event) => this.handleTouchStart(event));
        this.baseCanvas.addEventListener('touchmove', (event) => this.handleTouchMove(event));
        this.baseCanvas.addEventListener('touchend', () => this.handleTouchEnd());
    }
}