
// main.js
import { ViewManager } from './static/js/isbnmap/ViewManager.js';
import { InputManager } from './static/js/isbnmap/InputManager.js';
import { GlobalView } from './static/js/isbnmap/GlobalView.js';
import { ZoneView } from './static/js/isbnmap/ZoneView.js';
import { SocietalView } from './static/js/isbnmap/SocietalView.js';
import { BookshelfView } from './static/js/isbnmap/BookshelfView.js';
import { Tooltip } from './static/js/isbnmap/Tooltip.js';
import { TileManager } from './static/js/isbnmap/TileManager.js';


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
        case 'doubleClick':
            viewManager.handleDoubleClick(data);
            break;
    }
});

// Register views
viewManager.registerView(new GlobalView(baseCanvas, overlayCanvas));
viewManager.registerView(new ZoneView(baseCanvas, overlayCanvas));
const tile_nanager  = new TileManager({
    tileDir: './static/images/isbnmap/1_1/',
    tileWidth: 1000,
    tileHeight: 800,
    gridWidth: 50,
    gridHeight: 50,
});
const societalView = new SocietalView(baseCanvas, overlayCanvas, tile_nanager);
viewManager.registerView(societalView);
viewManager.registerView(new BookshelfView(baseCanvas, overlayCanvas, tile_nanager));


// Start rendering loop
viewManager.switchView('Global');

