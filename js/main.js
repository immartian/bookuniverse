
// main.js
import { ViewManager } from './ViewManager.js';
import { InputManager } from './InputManager.js';
import { GlobalView } from './GlobalView.js';
import { ZoneView } from './ZoneView.js';
import { SocietalView } from './SocietalView.js';
import { BookshelfView } from './BookshelfView.js';
import { Tooltip } from './Tooltip.js';


const baseCanvas = document.getElementById('mainCanvas');
const overlayCanvas = document.getElementById('overlayCanvas');
const viewManager = new ViewManager(baseCanvas, overlayCanvas);

// Initialize input manager
const inputManager = new InputManager(baseCanvas, (gesture, data) => {
    switch (gesture) {
        case 'zoom':
            viewManager.handleZoom(data);
            break;
        case 'hover':
            viewManager.handleHover(data);
            break;
        case 'panStart':
            viewManager.handlePanStart(data);
            break;
        case 'panMove':
            viewManager.handlePanMove(data);
            break;
        case 'panEnd':
            viewManager.handlePanEnd(data);
            break;
    }
});
// Register tooltip
const tooltip = new Tooltip();

// Register views
viewManager.registerView(new GlobalView(baseCanvas, overlayCanvas, tooltip));
viewManager.registerView(new ZoneView(baseCanvas, overlayCanvas));
const societalView = new SocietalView(baseCanvas, overlayCanvas, {
    tileDir: './tiles/',
    tileWidth: 1000,
    tileHeight: 800,
    gridWidth: 50,
    gridHeight: 50,
});
viewManager.registerView(societalView);
viewManager.registerView(new BookshelfView(baseCanvas, overlayCanvas, 15, 8));


// Start rendering loop
viewManager.switchView('Global');

