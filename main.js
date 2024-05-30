const SLIDER_STEP = 500;

function srgb_to_luminance(rgb) {
    
    rgb = rgb
        .map(x => x / 255)
        .map(x => (x <= 0.03928) ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function hls_to_luminance(hls) {
    return srgb_to_luminance(okhsl_to_srgb(hls));
}

function contrastRatio(l1, l2) {
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

class HTMLColorFieldSetElement extends HTMLFieldSetElement {
    constructor() {
        super()
        this.id = "";
        this.hsl = [0, 0, 0];
        this.luminance = 0;
    }

    static get observedAttributes() {
        return ['id'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        this[name] = newValue;
    }

    connectedCallback() {
        let label =
            this.input = document.createElement('input');
        this.input.type = 'color'
        this.appendChild(this.input);

        this.slider = document.createElement('input');
        this.slider.type = 'range';
        this.slider.min = 0;
        this.slider.max = SLIDER_STEP;
        this.slider.value = 0;
        this.appendChild(this.slider);

        this.span = document.createElement('span');
        this.span.innerText = `3.5 Test text ${this.id}`;
        this.appendChild(this.span);

        this.input.addEventListener('input', () => {
            this.setColor(srgb_to_okhsl(hex_to_rgb(this.input.value)));
        });

        this.slider.addEventListener('input', () => {
            let newHsl = this.hsl;
            newHsl[2] = this.slider.value / SLIDER_STEP;
            this.setColor(newHsl);
        })
    }

    setColor(hsl) {
        this.hsl = hsl;
        this.luminance = hls_to_luminance(this.hsl);

        this.input.value = rgb_to_hex(okhsl_to_srgb(this.hsl));
        this.slider.value = Math.round(this.hsl[2] * SLIDER_STEP);
        this.updateText();
    }

    updateText() {
        if (backgroundColor === null) {
            this.span.innerText = `no background color defined`;
            return;
        }

        let ratio = contrastRatio(this.luminance, backgroundColor.luminance);
        this.span.innerText = `${(ratio).toFixed(2)}`;
    }

}
window.customElements.define('color-fieldset', HTMLColorFieldSetElement, { extends: 'fieldset' });

let backgroundColor = null;
let colors = [];

const paletteForm = document.getElementById('import-palette');
paletteForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const body = document.body;

    let paletteJsonString = paletteForm.elements['json'].value;
    let palette = JSON.parse(paletteJsonString);

    for (let key in palette) {
        let fieldset = document.createElement('fieldset', { is: 'color-fieldset' });
        colors.push(fieldset);
        if (key === "background") {
            backgroundColor = fieldset;
        }
        fieldset.id = key;
        body.append(fieldset);
        fieldset.setColor(srgb_to_okhsl(hex_to_rgb(palette[key])));
    }

    colors.forEach((fieldset) => {
        fieldset.updateText();
    })
})

document.getElementById('json').value = JSON.stringify(DEFAULT_PALETTE);





