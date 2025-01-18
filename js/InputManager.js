export class InputManager {
    constructor(canvas, callback) {
        this.canvas = canvas;
        this.callback = callback;

        this.dragging = false; // Track whether panning is active
        this.lastX = 0;        // Last recorded x-position of the mouse
        this.lastY = 0;        // Last recorded y-position of the mouse
        this.throttleTimeout = null; // Throttle interval for panMove
        this.throttleInterval = 16;  // ~60fps for panMove

        this.initEvents();
    }

    initEvents() {
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault(); // Prevent the page from scrolling

            const delta = Math.sign(event.deltaY);
            // try to peiceive larger scroll as zoom
            // console.log(event.deltaY);
            if (Math.abs(event.deltaY) > 100) {
                this.callback('zoom', { delta: delta * 10, x: event.offsetX, y: event.offsetY });
                return;            
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
                this.callback('hover', { x: event.offsetX, y: event.offsetY });
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
