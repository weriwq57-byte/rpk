var Model = require('./model.js');

var passed = 0, failed = 0;

function check(name, cond) {
  if (cond) {
    passed++;
    console.log('  OK   ' + name);
  } else {
    failed++;
    console.log('  FAIL ' + name);
  }
}

function near(a, b, tol) { return Math.abs(a - b) <= tol; }

function nearArr(a, b, tol) {
  for (var i = 0; i < a.length; i++) {
    if (!near(a[i], b[i], tol)) return false;
  }
  return true;
}

function inRange(rgb) {
  return rgb[0] >= 0 && rgb[0] <= 255 &&
         rgb[1] >= 0 && rgb[1] <= 255 &&
         rgb[2] >= 0 && rgb[2] <= 255;
}

check('красный -> XYZ при D65',
  nearArr(Model.rgbToXyz(255, 0, 0, 'D65'), [0.4124, 0.2127, 0.0193], 0.002));

check('красный -> LAB при D65 (табличные 53.24, 80.09, 67.20)',
  nearArr(Model.rgbToLab(255, 0, 0, 'D65'), [53.24, 80.09, 67.20], 0.15));

check('белый -> LAB при D65 = (100, 0, 0)',
  nearArr(Model.rgbToLab(255, 255, 255, 'D65'), [100, 0, 0], 0.15));

check('белый -> XYZ = белая точка источника (D65, D50, E)',
  ['D65', 'D50', 'E'].every(function (illum) {
    var w = Model.getMatrices(illum).white;
    return nearArr(Model.rgbToXyz(255, 255, 255, illum), w, 0.001);
  }));

check('матрица D50: красный -> табличные значения',
  nearArr(Model.rgbToXyz(255, 0, 0, 'D50'), [0.4361, 0.2225, 0.0139], 0.005));

check('RGB -> HSV: красный, зелёный, серый',
  nearArr(Model.rgbToHsv(255, 0, 0), [0, 100, 100], 1) &&
  nearArr(Model.rgbToHsv(0, 255, 0), [120, 100, 100], 1) &&
  nearArr(Model.rgbToHsv(128, 128, 128), [0, 0, 50], 1));

check('HSV -> RGB: зелёный и сиреневый',
  nearArr(Model.hsvToRgb(120, 100, 100), [0, 255, 0], 1) &&
  nearArr(Model.hsvToRgb(300, 100, 50), [128, 0, 128], 1));

check('круговой RGB -> HSV -> RGB',
  nearArr(Model.hsvToRgb.apply(null, Model.rgbToHsv(255, 64, 64)), [255, 64, 64], 3) &&
  nearArr(Model.hsvToRgb.apply(null, Model.rgbToHsv(75, 0, 130)), [75, 0, 130], 3));

check('GCR: серый 128 целиком уходит в K',
  nearArr(Model.rgbToCmyk(128, 128, 128, 'GCR'), [0, 0, 0, 49.8], 0.5));

check('UCR: серый 128 без чёрного, тёмный 50 с чёрным в тени',
  nearArr(Model.rgbToCmyk(128, 128, 128, 'UCR'), [49.8, 49.8, 49.8, 0], 0.5) &&
  nearArr(Model.rgbToCmyk(50, 50, 50, 'UCR'), [19.6, 19.6, 19.6, 60.8], 0.5));

check('CMYK -> RGB: голубой и чёрный',
  nearArr(Model.cmykToRgb(100, 0, 0, 0), [0, 255, 255], 1) &&
  nearArr(Model.cmykToRgb(0, 0, 0, 100), [0, 0, 0], 1));

check('LAB вне охвата: флаг, clip и scale укладываются в [0, 255]',
  Model.labToRgb(20, 80, -80, 'D65', 'clip').outOfGamut === true &&
  inRange(Model.labToRgb(20, 80, -80, 'D65', 'clip').rgb) &&
  inRange(Model.labToRgb(20, 80, -80, 'D65', 'scale').rgb));

check('круговой RGB -> LAB -> RGB внутри охвата',
  nearArr(Model.labToRgb.apply(null, Model.rgbToLab(255, 0, 0, 'D65').concat('D65', 'clip')), [255, 0, 0], 2) &&
  nearArr(Model.labToRgb.apply(null, Model.rgbToLab(240, 248, 255, 'D65').concat('D65', 'clip')), [240, 248, 255], 2));

console.log('');
console.log('Пройдено: ' + passed + ', провалено: ' + failed);
process.exit(failed > 0 ? 1 : 0);
