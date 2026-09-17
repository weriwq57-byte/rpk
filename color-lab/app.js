var App = (function () {
  'use strict';

  
  var state = {
    illum: 'D65',
    strategy: 'clip',
    rgb: [255, 0, 0],
    lastLab: null,
    out: false
  };


  function cssRgb(v) {
    return 'rgb(' +
      Math.max(0, Math.min(255, Math.round(v[0]))) + ',' +
      Math.max(0, Math.min(255, Math.round(v[1]))) + ',' +
      Math.max(0, Math.min(255, Math.round(v[2]))) + ')';
  }


  function cssHsv(v) {
    return cssRgb(Model.hsvToRgb(v[0], v[1], v[2]));
  }

  function cssLab(v) {
    return cssRgb(Model.labToRgb(v[0], v[1], v[2], state.illum, 'clip').rgb);
  }


  
  function cssXyz(X, Y, Z) {
    return cssRgb(Model.xyzToRgb(X, Y, Z, 'D65', 'clip').rgb);
  }

  
  function refresh() {
    var rgb = state.rgb;
    var hsv = Model.rgbToHsv(rgb[0], rgb[1], rgb[2]);
    var xyz = Model.rgbToXyz(rgb[0], rgb[1], rgb[2], state.illum);
    var lab = Model.xyzToLab(xyz[0], xyz[1], xyz[2], state.illum);

   
    if (!state.out) {
      state.lastLab = [Math.round(lab[0]), Math.round(lab[1]), Math.round(lab[2])];
    }


    var hex = '#' + rgb.map(function (v) {
      var s = v.toString(16).toUpperCase();
      return s.length < 2 ? '0' + s : s;
    }).join('');

    View.update({
      rgb: rgb,
      hsv: hsv,
      lab: lab,
      hex: hex,
      xyz: xyz,
      warning: state.out ? 'Цвет вне диапазона sRGB: применено ' +
        (state.strategy === 'clip' ? 'обрезание' : 'масштабирование') +
        ' и округление компонентов.' : null,
      dotColor: cssRgb(rgb)
    });
  }


  function reset() {
    state.out = false;
    state.lastLab = null;
  }

  function editFrom(key, values) {
    if (key === 'rgb') {
      reset();
      state.rgb = values;
    } else if (key === 'hsv') {
      reset();
      state.rgb = Model.hsvToRgb(values[0], values[1], values[2]);
    } else {
      editFromLab(values);
    }
    refresh();
  }

  function editFromLab(values) {
    state.lastLab = values;
    var res = Model.labToRgb(values[0], values[1], values[2], state.illum, state.strategy);
    state.rgb = res.rgb;
    state.out = res.outOfGamut;
  }

 
  function setIllum(v) {
    state.illum = v;
    if (state.out && state.lastLab) editFromLab(state.lastLab);
    else reset();
    refresh();
  }

 
  function setStrategy(v) {
    state.strategy = v;
    if (state.out && state.lastLab) editFromLab(state.lastLab);
    refresh();
  }

 
  function setFromPalette(rgb) {
    reset();
    state.rgb = rgb;
    refresh();
  }

  function init() {
    View.init({
      panels: [
        {
          key: 'rgb',
          title: 'RGB (красный, зелёный, синий)',
          fields: [
            { name: 'R', min: 0, max: 255 },
            { name: 'G', min: 0, max: 255 },
            { name: 'B', min: 0, max: 255 }
          ]
        },
        {
          key: 'hsv',
          title: 'HSV (тон, насыщенность, яркость)',
          fields: [
            { name: 'H', min: 0, max: 360 },
            { name: 'S', min: 0, max: 100 },
            { name: 'V', min: 0, max: 100 }
          ]
        },
        {
          key: 'lab',
          title: 'LAB (МКО)',
          fields: [
            { name: 'L', min: 0, max: 100 },
            { name: 'a', min: -128, max: 127 },
            { name: 'b', min: -128, max: 127 }
          ]
        }
      ],
      colors: { rgb: cssRgb, hsv: cssHsv, lab: cssLab },
      xyzToCss: cssXyz,
      onEdit: editFrom,
      onIllum: setIllum,
      onStrategy: setStrategy,
      onPalette: setFromPalette
    });
    refresh();
  }

  return {
    init: init
  };
})();


App.init();
