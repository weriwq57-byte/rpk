var View = (function () {
  'use strict';

    var els = {};

  var panels = {};

  var colorFns = {};

  function qs(id) { return document.getElementById(id); }

  function buildPanel(cfg, onEdit) {
    var box = document.createElement('section');
    box.className = 'model-panel';
    var title = document.createElement('h2');
    title.textContent = cfg.title;
    box.appendChild(title);

    var sliders = [], numbers = [];
    cfg.fields.forEach(function (field) {
      var row = document.createElement('div');
      row.className = 'row';

      var label = document.createElement('span');
      label.className = 'chname';
      label.textContent = field.name;
      row.appendChild(label);

      var range = document.createElement('input');
      range.type = 'range';
      range.min = field.min; range.max = field.max; range.step = 1;
      range.value = field.min;
      range.addEventListener('input', function () {
        num.value = range.value;
        onEdit(cfg.key, readPanel(cfg.key));
      });
      row.appendChild(range);
      sliders.push(range);

      var num = document.createElement('input');
      num.type = 'number';
      num.min = field.min; num.max = field.max; num.step = 1;
      num.value = field.min;
      num.title = 'Точное значение';
      num.addEventListener('change', function () {
        onEdit(cfg.key, readPanel(cfg.key));
      });
      row.appendChild(num);
      numbers.push(num);

      box.appendChild(row);
    });

    qs('panels').appendChild(box);
    panels[cfg.key] = { cfg: cfg, sliders: sliders, numbers: numbers };
  }

  function readPanel(key) {
    return panels[key].cfg.fields.map(function (field, idx) {
      var v = parseInt(panels[key].numbers[idx].value, 10);
      if (isNaN(v)) v = parseInt(panels[key].sliders[idx].value, 10);
      if (isNaN(v)) v = field.min;
      return Math.max(field.min, Math.min(field.max, v));
    });
  }

  function drawGradients() {
    var STEPS = 11;
    Object.keys(panels).forEach(function (key) {
      var p = panels[key];
      var colorFor = colorFns[key];
      var values = readPanel(key);
      p.cfg.fields.forEach(function (field, j) {
        var stops = [];
        for (var t = 0; t < STEPS; t++) {
          var v = values.slice();
          v[j] = field.min + (field.max - field.min) * t / (STEPS - 1);
          stops.push(colorFor(v) + ' ' + (t * 100 / (STEPS - 1)).toFixed(0) + '%');
        }
        p.sliders[j].style.background =
          'linear-gradient(to right, ' + stops.join(', ') + ')';
      });
    });
  }

  function writePanel(key, values) {
    var p = panels[key];
    p.cfg.fields.forEach(function (field, idx) {
      var v = Math.max(field.min, Math.min(field.max, Math.round(values[idx])));
      p.sliders[idx].value = v;
      if (document.activeElement !== p.numbers[idx]) {
        p.numbers[idx].value = v;
      }
    });
  }

  function showPreview(hex, rgb) {
    els.preview.style.background =
      'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
    els.hex.textContent = hex;
  }

  function init(cfg) {
    colorFns = cfg.colors;

    els.preview = qs('preview');
    els.hex = qs('hex');
    els.warning = qs('warning');

    cfg.panels.forEach(function (p) { buildPanel(p, cfg.onEdit); });

    qs('illum').addEventListener('change', function (e) { cfg.onIllum(e.target.value); });
    qs('strategy').addEventListener('change', function (e) { cfg.onStrategy(e.target.value); });

    var picker = qs('colorPicker');
    picker.addEventListener('input', function () {
      var v = picker.value;
      cfg.onPalette([
        parseInt(v.slice(1, 3), 16),
        parseInt(v.slice(3, 5), 16),
        parseInt(v.slice(5, 7), 16)
      ]);
    });
  }

  function update(st) {
    writePanel('rgb', st.rgb);
    writePanel('hsv', st.hsv);
    writePanel('lab', st.lab);
    drawGradients();
    showPreview(st.hex, st.rgb);

    if (st.warning) {
      els.warning.hidden = false;
      els.warning.textContent = st.warning;
    } else {
      els.warning.hidden = true;
    }
  }

  return { init: init, update: update };
})();
