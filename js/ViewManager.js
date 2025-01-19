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

    switchView(viewName, options = {}) {
        if (this.currentView) {
            this.currentView.stopRendering(); // Stop the current view's animation
            this.currentView.onExit();
        }
    
        this.currentView = this.views[viewName];
        this.currentView.onEnter(options);
    }
    

    handleZoom(data) {
        if (data.delta < 0) {
            if (this.currentView?.name === 'Global') {
            console.log('Zooming from Global to Zone');
            this.currentView.zoom_effect(data, 2);
            if (this.currentView.zoom >= 5) {
                this.currentView.zoom = 1;
                this.switchView('Zone');
            }
            } else if (this.currentView?.name === 'Zone') {
            console.log('Switching to Societal View');
            this.switchView('Societal');
            } 
            // else if (this.currentView?.name === 'Societal') {
            // console.log('Switching to Bookshelf View');
            // this.switchView('Bookshelf');
            // }
        } else if (data.delta > 0) {
            // if (this.currentView?.name === 'Bookshelf') {
            // console.log('Switching to Societal View');
            // this.switchView('Societal');
            // } else 
            if (this.currentView?.name === 'Societal') {
            console.log('Switching to Zone View');
            this.switchView('Zone');
            } else if (this.currentView?.name === 'Zone') {
            console.log('Switching to Global View');
            this.switchView('Global');
            }
        }
        
        // Clean overlay canvas
        this.overlayCanvas.getContext('2d').clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        
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