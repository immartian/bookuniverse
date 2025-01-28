export class ViewManager {
    constructor(baseCanvas, overlayCanvas) {
        this.baseCanvas = baseCanvas;
        this.overlayCanvas = overlayCanvas;
        this.currentView = null;
        this.views = {};
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
    

    async handleZoom(data) {
        if (data.delta < 0) {
            if (this.currentView?.name === 'Global') {
                await this.currentView.zoom_effect(data, 5);  // Wait for zoom to complete
                this.switchView('Zone', data);
            } else if (this.currentView?.name === 'Zone') {
                await this.currentView.zoom_effect(data, 10);  // Wait for zoom to complete
                this.switchView('Societal', data);
            } 
            else if (this.currentView?.name === 'Societal') {
                await this.currentView.zoom_effect(data, 3);
                this.switchView('Bookshelf', data);
            }
        } else if (data.delta > 0) {
            // if (this.currentView?.name === 'Bookshelf') {
            // console.log('Switching to Societal View');
            // this.switchView('Societal');
            // } else 
            if (this.currentView?.name === 'Societal') {
                //await this.currentView.zoom_effect(data, 1/5);  
                this.switchView('Zone', data);
            } else if (this.currentView?.name === 'Zone') {
                //await this.currentView.zoom_effect(data, 1/10);  
                this.switchView('Global', data);
            } else if (this.currentView?.name === 'Bookshelf') {
                this.switchView('Societal', data);
                //await this.currentView.zoom_effect(data, 1/10);
            }
        
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