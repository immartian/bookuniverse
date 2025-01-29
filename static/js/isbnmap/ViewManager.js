export class ViewManager {
    constructor(baseCanvas, overlayCanvas) {
        this.baseCanvas = baseCanvas;
        this.overlayCanvas = overlayCanvas;
        this.currentView = null;
        this.views = {};
    
        this.handleZoom = ViewManager.debounce(this.handleZoom.bind(this), 300);
    }

    registerView(view) {
        this.views[view.name] = view;
    }

    switchView(viewName, data) {
        let currentISBN = 0; 
        if (this.currentView) {
            this.currentView.stopRendering(); // Stop the current view's animation
            this.currentView.onExit();
            currentISBN = this.currentView.isbnIndex;
        }
    
        this.currentView = this.views[viewName];
        this.currentView.isbnIndex = currentISBN; // Pass the current ISBN index to the new view
        this.currentView.onEnter(data);
    }
  

    static debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }
    

    async handleZoom(data) {
        let nextView = null;
        if (data.delta < 0) { // Zoom In
            if (this.currentView?.name === 'Global') nextView = 'Zone';
            else if (this.currentView?.name === 'Zone') nextView = 'Societal';
            else if (this.currentView?.name === 'Societal') nextView = 'Bookshelf';
        } else if (data.delta > 0) { // Zoom Out
            if (this.currentView?.name === 'Bookshelf') nextView = 'Societal';
            else if (this.currentView?.name === 'Societal') nextView = 'Zone';
            else if (this.currentView?.name === 'Zone') nextView = 'Global';
        }

        if (nextView) {
            //await this.currentView.zoom_effect(data, 5); // Wait for zoom animation
            this.switchView(nextView, data);
        }
    }

    handlePanStart(data) {
        if (this.currentView && this.currentView.handlePanStart) {
            // change mouse cursor to grabbing
            this.baseCanvas.style.cursor = 'grabbing';
            this.currentView.handlePanStart(data);
        }
    }
    handlePanMove(data) {
        if (this.currentView && this.currentView.handlePanMove) {
            this.currentView.handlePanMove(data);
        }
    }
    handlePanEnd(data) {
        if (this.currentView && this.currentView.handlePanEnd) {
            // change mouse cursor back to normal
            this.baseCanvas.style.cursor = 'default';
            this.currentView.handlePanEnd(data);
        }
    }

    handleHover(data) {
        if (this.currentView && this.currentView.handleHover) {
            this.currentView.handleHover(data);
        }
    }

    handleDoubleClick(data) {
        if (this.currentView && this.currentView.handleDoubleClick) {
            this.currentView.handleDoubleClick(data);
        }
    }

}