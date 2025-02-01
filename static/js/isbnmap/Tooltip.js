// Tooltip.js
export class Tooltip {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'tooltip';
        this.x = this.y = 0; 
        document.body.appendChild(this.element);
    }

    show(content) {
        this.element.innerHTML = content;
        this.element.style.left = `${this.x + 10}px`;
        this.element.style.top = `${this.y + 10}px`;
        this.element.style.display = 'block';
    }

    hide() {
        this.element.style.display = 'none';
    }
}
