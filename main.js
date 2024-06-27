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
        this.isBackground = false;
    }

    static get observedAttributes() {
        return ['id', 'changed'];
    }

    attributeChangedCallback(property, oldValue, newValue) {
        if (oldValue === newValue) return;
        this[property] = newValue;
    }

    connectedCallback() {
        this.className = 'list-group-item p-0';

        this.row = document.createElement('div');
        this.row.className = 'row g-0';
        this.appendChild(this.row);

        this.preview = document.createElement('div');
        this.preview.className = 'col-9';
        this.row.appendChild(this.preview);

        this.previewRow = document.createElement('div');
        this.previewRow.className = 'row g-0 text-center';
        this.preview.appendChild(this.previewRow);

        this.before = document.createElement('div');
        this.before.id = 'collapseBefore';
        this.before.className = 'col p-2 collapse multi-collapse collapse-horizontal';
        this.previewRow.appendChild(this.before);

        this.originalColorRatio = document.createElement('span');
        this.originalColorRatio.style.fontSize = '1em';
        this.originalColorRatio.className = 'badge text-bg-light';
        this.before.appendChild(this.originalColorRatio);

        this.originalSample = document.createElement('code');
        this.originalSample.className = 'text-center';
        this.originalSample.innerText = "Sample Text: a + b = c";
        this.before.appendChild(this.originalSample);

        this.after = document.createElement('div');
        this.after.className = 'col p-2 show multi-collapse';
        this.previewRow.appendChild(this.after);

        this.sample = document.createElement('code');
        this.sample.className = 'text-center';
        this.sample.innerText = "Sample Text: a + b = c";
        this.after.appendChild(this.sample);

        this.colorRatio = document.createElement('span');
        this.colorRatio.className = 'badge text-bg-light';
        this.colorRatio.style.fontSize = '1em';
        this.after.appendChild(this.colorRatio);

        /* const rule = document.createElement('div');
        rule.className = 'vr';
        this.appendChild(rule); */

        this.editor = document.createElement('div');
        this.editor.className = 'col';
        this.row.appendChild(this.editor);

        this.editorRow = document.createElement('div');
        this.editorRow.className = 'hstack gap-2';
        this.editor.appendChild(this.editorRow);

        this.nameLabel = document.createElement('p');
        this.nameLabel.className = 'col-4';
        this.editorRow.appendChild(this.nameLabel);

        // const collapse = document.createElement('button');

        this.resetButton = document.createElement('button');
        this.resetButton.innerText = 'Clear';
        this.resetButton.addEventListener('click', (event) => {
            event.preventDefault();
            this.setColor(this.originalHsl);
            this.changed = false;
            // this.removeAttribute('modified');
        });
        this.editorRow.appendChild(this.resetButton);

        this.slider = document.createElement('input');
        this.slider.type = 'range';
        this.slider.className = 'form-range';
        this.slider.min = 0;
        this.slider.max = 1;
        this.slider.step = 0.005;
        this.slider.value = 0;
        this.slider.addEventListener('input', () => {
            let newHsl = this.hsl;
            newHsl[2] = parseFloat(this.slider.value);
            this.setColor(newHsl);
        });
        this.editorRow.appendChild(this.slider);

        this.input = document.createElement('input');
        this.input.className = 'form-control form-control-color';
        this.input.type = 'color';
        this.input.addEventListener('input', () => {
            this.setColor(srgb_to_okhsl(hex_to_rgb(this.input.value)));
        });
        this.editorRow.appendChild(this.input);
    }

    setColor(hsl) {
        this.hsl = hsl.map(x => x); // Pass by copy
        this.changed = hsl[0] !== this.originalHsl[0] || hsl[1] !== this.originalHsl[1] || hsl[2] !== this.originalHsl[2];

        this.input.value = rgb_to_hex(okhsl_to_srgb(this.hsl));
        this.slider.value = this.hsl[2];
        if (this.changed) {
            this.resetButton.style.visibility = 'visible';
            // this.setAttribute('modified', '');
        } else {
            this.resetButton.style.visibility = 'hidden';
            // this.removeAttribute('modified');
        }

        this.originalSample.style.color = rgb_to_hex(okhsl_to_srgb(this.originalHsl));
        this.sample.style.color = rgb_to_hex(okhsl_to_srgb(this.hsl));

        updateBackgrounds();
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

    setId(id) {
        this.id = id;
        this.nameLabel.innerText = id;
    }

}
window.customElements.define('color-fieldset', HTMLColorFieldSetElement, { extends: 'li' });

let backgroundColor = null;
let colors = [];
let list = document.getElementById('color-list');
let nextColorId = 0;

const root = document.getElementById('palette-edition');

const paletteForm = document.getElementById('import-palette');
paletteForm.addEventListener('submit', (event) => {
    event.preventDefault();

    let paletteJsonString = paletteForm.elements['json'].value;
    let palette = JSON.parse(paletteJsonString);

    for (let key in palette) {
        let fieldset = document.createElement('li', { is: 'color-fieldset' });
        colors.push(fieldset);
        if (key === "background") {
            backgroundColor = fieldset;
        }
        list.append(fieldset);
        fieldset.setId(key);


        let hsl = srgb_to_okhsl(hex_to_rgb(palette[key]));
        fieldset.originalHsl = hsl;
        fieldset.setColor(hsl);
    }

    colors.forEach((fieldset) => {
        fieldset.updateRatio();
    })
    updateBackgrounds();
})

function updateBackgrounds() {
    if (backgroundColor === null) return;

    colors.forEach((fieldset) => {
        fieldset.before.style.backgroundColor = rgb_to_hex(okhsl_to_srgb(backgroundColor.originalHsl));
        fieldset.after.style.backgroundColor = rgb_to_hex(okhsl_to_srgb(backgroundColor.hsl));
    })
}


const colorForm = document.getElementById('import-color');
colorForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const root = document.getElementById('palette-edition');

    if (list === null) {
        list = document.createElement('ul');
        list.className = 'list-group list-group-flush';
        root.prepend(list);
    }

    let color = colorForm.elements['hex-color'].value;

    let fieldset = document.createElement('li', { is: 'color-fieldset' });
    fieldset.className = 'list-group-item';
    colors.push(fieldset);
    list.append(fieldset);
    fieldset.setId(`color-${nextColorId}`);
    nextColorId++;

    let hsl = srgb_to_okhsl(hex_to_rgb(color));
    fieldset.originalHsl = hsl;
    fieldset.setColor(hsl);

    colors.forEach((fieldset) => {
        fieldset.updateRatio();
    })
})

const exportForm = document.getElementById('export-palette');
exportForm.addEventListener('submit', (event) => {
    event.preventDefault();
    let result = {};
    for (let i = 0; i < list.children.length; i++) {
        result[list.children[i].id] = rgb_to_hex(okhsl_to_srgb(list.children[i].hsl));
    }
    navigator.clipboard.writeText(JSON.stringify(result)).then(function () {
        console.log('Async: Copying to clipboard was successful!');
    }, function (err) {
        console.error('Async: Could not copy text: ', err);
    });
})

const colorPicker = document.getElementById('color-picker');
const hexColor = document.getElementById('hex-color');
colorPicker.addEventListener('input', () => {
    hexColor.value = colorPicker.value;
})
hexColor.addEventListener('change', () => {
    colorPicker.value = hexColor.value;
})

document.getElementById('json').value = JSON.stringify(DEFAULT_PALETTE);





