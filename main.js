function srgb_to_luminance(rgb) {
    rgb = rgb
        .map(x => x / 255)
        .map(x => (x <= 0.03928) ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function hls_to_luminance(hls) {
    return srgb_to_luminance(okhsl_to_srgb(hls));
}

function contrastRatioFromHsl(hsl1, hsl2) {
    return contrastRatio(hls_to_luminance(hsl1), hls_to_luminance(hsl2));
}

function contrastRatio(l1, l2) {
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

class HTMLColorFieldSetElement extends HTMLLIElement {
    constructor() {
        super();
        this.id = '';
        this.hsl = [0, 0, 0];
        this.originalHsl = [0, 0, 0];
        this.changed = false;
    }

    static get observedAttributes() {
        return ['id', 'changed'];
    }

    attributeChangedCallback(property, oldValue, newValue) {
        if (oldValue === newValue) return;
        this[property] = newValue;
    }

    connectedCallback() {
        this.className = 'list-group-item d-flex';

        const grow = document.createElement('div');
        grow.className = 'flex-grow-1 d-flex justify-content-between';
        this.appendChild(grow);

        this.originalColorRatio = document.createElement('span');
        this.originalColorRatio.style.flexBasis = '4%';
        // this.originalColorRatio.className = "ratio";
        grow.appendChild(this.originalColorRatio);

        this.originalSample = document.createElement('span');
        this.originalSample.innerText = "Sample Text: a + b = c";
        grow.appendChild(this.originalSample);

        this.sample = document.createElement('span');
        this.sample.innerText = "Sample Text: a + b = c";
        grow.appendChild(this.sample);
        
        this.colorRatio = document.createElement('span');
        // this.colorRatio.className = "ratio";
        this.colorRatio.style.flexBasis = '4%';
        grow.appendChild(this.colorRatio);

        this.slider = document.createElement('input');
        this.slider.type = 'range';
        this.slider.className = 'form-range';
        this.slider.min = 0;
        this.slider.max = 1;
        this.slider.step = 0.005;
        this.slider.value = 0;
        this.slider.style.flexBasis = '10%';
        this.slider.addEventListener('input', () => {
            let newHsl = this.hsl;
            newHsl[2] = this.slider.value;
            this.setColor(newHsl);
        });
        this.appendChild(this.slider);

        this.input = document.createElement('input');
        this.input.type = 'color'
        this.input.className = 'form-control form-control-color'
        this.appendChild(this.input);
        this.input.addEventListener('input', () => {
            this.setColor(srgb_to_okhsl(hex_to_rgb(this.input.value)));
        });

        this.resetButton = document.createElement('button');
        this.resetButton.innerText = 'Clear';
        this.resetButton.addEventListener('click', (event) => {
            event.preventDefault();
            this.setColor(this.originalHsl);
            this.changed = false;
            // this.removeAttribute('modified');
        });
        this.appendChild(this.resetButton);
    }

    setColor(hsl) {
        this.hsl = hsl.map(x => x); // Pass by copy
        this.changed = hsl[0] !== this.originalHsl[0] || hsl[1] !== this.originalHsl[1] || hsl[2] !== this.originalHsl[2];

        this.input.value = rgb_to_hex(okhsl_to_srgb(this.hsl));
        this.slider.value = this.hsl[2];
        if (this.changed) {
            this.resetButton.removeAttribute('hidden');
            // this.setAttribute('modified', '');
        } else {
            this.resetButton.setAttribute('hidden', '');
            // this.removeAttribute('modified');
        }

        this.originalSample.style.color = rgb_to_hex(okhsl_to_srgb(this.originalHsl));
        this.sample.style.color = rgb_to_hex(okhsl_to_srgb(this.hsl));
        this.updateRatio();
    }

    updateRatio() {
        if (backgroundColor === null) {
            this.originalColorRatio.innerText = `no background color defined`;
            this.colorRatio.innerText = `no background color defined`;
            return;
        }
        else {
            this.originalColorRatio.innerText = contrastRatioFromHsl(this.originalHsl, backgroundColor.hsl).toFixed(2);
            this.colorRatio.innerText = contrastRatioFromHsl(this.hsl, backgroundColor.hsl).toFixed(2);
        }
    }

}
window.customElements.define('color-fieldset', HTMLColorFieldSetElement, { extends: 'li' });

let backgroundColor = null;
let colors = [];

const paletteForm = document.getElementById('import-palette');
paletteForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const root = document.getElementById('palette-edition');

    const list = document.createElement('ul');
    list.className = 'list-group list-group-flush';
    root.appendChild(list);

    let paletteJsonString = paletteForm.elements['json'].value;
    let palette = JSON.parse(paletteJsonString);

    for (let key in palette) {
        let fieldset = document.createElement('li', { is: 'color-fieldset' });
        fieldset.className = 'list-group-item';
        colors.push(fieldset);
        if (key === "background") {
            backgroundColor = fieldset;
        }
        fieldset.id = key;
        list.append(fieldset);

        let hsl = srgb_to_okhsl(hex_to_rgb(palette[key]));
        fieldset.originalHsl = hsl;
        fieldset.setColor(hsl);
    }

    colors.forEach((fieldset) => {
        fieldset.updateRatio();
    })
})

document.getElementById('json').value = JSON.stringify(DEFAULT_PALETTE);





