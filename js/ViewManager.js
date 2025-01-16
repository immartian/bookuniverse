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
        if (this.currentView) this.currentView.onExit();
        this.currentView = this.views[viewName];
        this.currentView.onEnter(options);
    }

    handleZoom(data) {
        if (data.delta < 0) {
            if (this.currentView?.name === 'Global') {
            console.log('Switching to Zone View');
            this.switchView('Zone');
            } else if (this.currentView?.name === 'Zone') {
            console.log('Switching to Societal View');
            this.switchView('Societal');
            } else if (this.currentView?.name === 'Societal') {
            console.log('Switching to Bookshelf View');
            this.switchView('Bookshelf');
            }
        } else if (data.delta > 0) {
            if (this.currentView?.name === 'Bookshelf') {
            console.log('Switching to Societal View');
            this.switchView('Societal');
            } else if (this.currentView?.name === 'Societal') {
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
            this.currentView.handlePanEnd(data);
        }
    }

    handleHover(data) {
        if (this.currentView && this.currentView.handleHover) {
            this.currentView.handleHover(data);
        }
    }

    render() {
        if (this.currentView) {
            this.currentView.drawBase();
            this.currentView.drawOverlay();
        }
    }
}