// Tooltip.js
export class Tooltip {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'tooltip';
        document.body.appendChild(this.element);
    }

    show(content, x, y) {
        this.element.innerHTML = content;
        this.element.style.left = `${x + 10}px`;
        this.element.style.top = `${y + 10}px`;
        this.element.style.display = 'block';
    }

    hide() {
        this.element.style.display = 'none';
    }
}
