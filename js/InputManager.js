export class InputManager {
    constructor(canvas, callback) {
        this.canvas = canvas;
        this.callback = callback;

        this.dragging = false; // Track whether panning is active
        this.lastX = 0;        // Last recorded x-position of the mouse
        this.lastY = 0;        // Last recorded y-position of the mouse
        this.throttleTimeout = null; // Throttle interval for panMove
        this.throttleInterval = 16;  // ~60fps for panMove


        this.zoomDelta = 0; // Accumulator for zoom delta
        this.zoomThreshold = 110; // Threshold for triggering zoom

        this.initEvents();
    }

    initEvents() {
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault(); // Prevent the page from scrolling
    
            // Accumulate the deltaY value
            this.zoomDelta += event.deltaY;
    
            // Trigger zoom if the threshold is exceeded
            if (Math.abs(this.zoomDelta) > this.zoomThreshold) {
                const delta = Math.sign(this.zoomDelta); // Determine zoom direction
                this.callback('zoom', {
                    delta: delta, // Pass the direction (1 for zoom in, -1 for zoom out)
                    x: event.offsetX,
                    y: event.offsetY,
                });
    
                this.zoomDelta = 0; // Reset the accumulator after triggering zoom
            }
        });
        this.canvas.addEventListener('mousemove', (event) => {
            if (this.dragging) {
                // Throttled panning callback
                if (!this.throttleTimeout) {
                    this.throttleTimeout = setTimeout(() => {
                        this.callback('panMove', {
                            deltaX: event.offsetX - this.lastX,
                            deltaY: event.offsetY - this.lastY,
                        });
                        this.lastX = event.offsetX;
                        this.lastY = event.offsetY;
                        this.throttleTimeout = null;
                    }, this.throttleInterval);
                }
            } else {
                // Hover callback
                this.callback('hover', { x: event.offsetX, y: event.offsetY, clientX: event.clientX, clientY: event.clientY });
            }
        });

        this.canvas.addEventListener('mousedown', (event) => {
            this.dragging = true;
            this.lastX = event.offsetX;
            this.lastY = event.offsetY;
            this.callback('panStart', { x: event.offsetX, y: event.offsetY });
        });

        this.canvas.addEventListener('mouseup', () => {
            this.dragging = false;
            this.callback('panEnd');
        });

        this.canvas.addEventListener('mouseleave', () => {
            if (this.dragging) {
                this.dragging = false;
                this.callback('panEnd');
            }
        });
        this.canvas.addEventListener('dblclick', (event) => {
            this.callback('doubleClick', { delta: 10, x: event.offsetX, y: event.offsetY });
        });
    }
}
