var Model = (function () {
  'use strict';

  var PRIMARIES = [
    [0.640, 0.330],  
    [0.300, 0.600],  
    [0.150, 0.060]   
  ];

  var REF_WHITE = 'D65';

  var ILLUMINANTS = {
    D65: [0.3127, 0.3290],
    D50: [0.3457, 0.3585],
    E:   [1 / 3,   1 / 3]
  };

  var BRADFORD = [
    [ 0.8951,  0.2664, -0.1614],
    [-0.7502,  1.7135,  0.0367],
    [ 0.0389, -0.0685,  1.0296]
  ];

  var EPS   = 216 / 24389;
  var KAPPA = 24389 / 27;


  function mul3(A, B) {
    var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        for (var k = 0; k < 3; k++) {
          C[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return C;
  }

  function apply3(M, v) {
    return [
      M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
      M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
      M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]
    ];
  }

  function inv3(m) {
    var a = m[0][0], b = m[0][1], c = m[0][2];
    var d = m[1][0], e = m[1][1], f = m[1][2];
    var g = m[2][0], h = m[2][1], i = m[2][2];
    var A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
    var det = a * A + b * B + c * C;
    return [
      [A / det, (c * h - b * i) / det, (b * f - c * e) / det],
      [B / det, (a * i - c * g) / det, (c * d - a * f) / det],
      [C / det, (b * g - a * h) / det, (a * e - b * d) / det]
    ];
  }

  function diag3(s) {
    return [[s[0], 0, 0], [0, s[1], 0], [0, 0, s[2]]];
  }

  function xyToXYZ(xy) {
    var x = xy[0], y = xy[1];
    return [x / y, 1, (1 - x - y) / y];
  }

  var matCache = {};

  function getMatrices(illum) {
    if (matCache[illum]) return matCache[illum];

    var prim = PRIMARIES.map(function (p) { return xyToXYZ(p); });
    var M = [
      [prim[0][0], prim[1][0], prim[2][0]],
      [prim[0][1], prim[1][1], prim[2][1]],
      [prim[0][2], prim[1][2], prim[2][2]]
    ];

    var wRef = xyToXYZ(ILLUMINANTS[REF_WHITE]);
    var s = apply3(inv3(M), wRef);
    var M0 = [
      [M[0][0] * s[0], M[0][1] * s[1], M[0][2] * s[2]],
      [M[1][0] * s[0], M[1][1] * s[1], M[1][2] * s[2]],
      [M[2][0] * s[0], M[2][1] * s[1], M[2][2] * s[2]]
    ];

    var white = xyToXYZ(ILLUMINANTS[illum]);
    var c1 = apply3(BRADFORD, wRef);
    var c2 = apply3(BRADFORD, white);
    var k = [c2[0] / c1[0], c2[1] / c1[1], c2[2] / c1[2]];
    var Ma = mul3(inv3(BRADFORD), mul3(diag3(k), BRADFORD));

    var fwd = mul3(Ma, M0);
    matCache[illum] = { fwd: fwd, inv: inv3(fwd), white: white };
    return matCache[illum];
  }

  function srgbToLinear(c255) {
    var c = c255 / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function linearToSrgb255(lin) {
    var c = lin <= 0.0031308 ? 12.92 * lin : 1.055 * Math.pow(lin, 1 / 2.4) - 0.055;
    return c * 255;
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;
    if (d > 0) {
      if (max === r)      h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else                h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    var s = max > 0 ? (d / max) * 100 : 0;
    return [Math.round(h), Math.round(s), Math.round(max * 100)];
  }

  function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    s /= 100; v /= 100;
    var c = v * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = v - c;
    var part;
    switch (Math.floor(h / 60)) {
      case 0: part = [c, x, 0]; break;
      case 1: part = [x, c, 0]; break;
      case 2: part = [0, c, x]; break;
      case 3: part = [0, x, c]; break;
      case 4: part = [x, 0, c]; break;
      default: part = [c, 0, x]; break;
    }
    return [
      Math.round((part[0] + m) * 255),
      Math.round((part[1] + m) * 255),
      Math.round((part[2] + m) * 255)
    ];
  }

  function rgbToXyz(r, g, b, illum) {
    var lin = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
    return apply3(getMatrices(illum).fwd, lin);
  }

  function xyzToLab(X, Y, Z, illum) {
    var w = getMatrices(illum).white;
    function f(t) { return t > EPS ? Math.cbrt(t) : (KAPPA * t + 16) / 116; }
    var fx = f(X / w[0]), fy = f(Y / w[1]), fz = f(Z / w[2]);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function labToXyz(L, a, b, illum) {
    var w = getMatrices(illum).white;
    var fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
    function finv(v) {
      var v3 = v * v * v;
      return v3 > EPS ? v3 : (116 * v - 16) / KAPPA;
    }
    return [finv(fx) * w[0], finv(fy) * w[1], finv(fz) * w[2]];
  }

  function applyStrategy(lin, strategy) {
    var lo = Math.min(lin[0], lin[1], lin[2]);
    var hi = Math.max(lin[0], lin[1], lin[2]);
    var outOfGamut = (lo < -1e-9) || (hi > 1 + 1e-9);
    var res = [lin[0], lin[1], lin[2]];
    if (outOfGamut) {
      if (strategy === 'scale') {
        var dev = Math.max(hi - 0.5, 0.5 - lo);
        var k = 0.5 / dev;
        res = [0.5 + (lin[0] - 0.5) * k,
               0.5 + (lin[1] - 0.5) * k,
               0.5 + (lin[2] - 0.5) * k];
      } else {
        res = [Math.max(0, Math.min(1, lin[0])),
               Math.max(0, Math.min(1, lin[1])),
               Math.max(0, Math.min(1, lin[2]))];
      }
    }
    return { lin: res, outOfGamut: outOfGamut };
  }

  function xyzToRgb(X, Y, Z, illum, strategy) {
    var lin = apply3(getMatrices(illum).inv, [X, Y, Z]);
    var st = applyStrategy(lin, strategy);
    return {
      rgb: [
        Math.round(linearToSrgb255(st.lin[0])),
        Math.round(linearToSrgb255(st.lin[1])),
        Math.round(linearToSrgb255(st.lin[2]))
      ],
      outOfGamut: st.outOfGamut
    };
  }

  function rgbToLab(r, g, b, illum) {
    var xyz = rgbToXyz(r, g, b, illum);
    return xyzToLab(xyz[0], xyz[1], xyz[2], illum);
  }

  function labToRgb(L, a, b, illum, strategy) {
    var xyz = labToXyz(L, a, b, illum);
    var res = xyzToRgb(xyz[0], xyz[1], xyz[2], illum, strategy);
    return { rgb: res.rgb, outOfGamut: res.outOfGamut, xyz: xyz };
  }

  function rgbToCmyk(r, g, b, algo) {
    r /= 255; g /= 255; b /= 255;
    var c = 1 - r, m = 1 - g, y = 1 - b;
    var kmin = Math.min(c, m, y);
    var k = algo === 'GCR' ? kmin : (kmin <= 0.5 ? 0 : (kmin - 0.5) * 2);
    return [(c - k) * 100, (m - k) * 100, (y - k) * 100, k * 100];
  }

  function cmykToRgb(c, m, y, k) {
    c /= 100; m /= 100; y /= 100; k /= 100;
    return [
      Math.round(255 * (1 - Math.min(1, c * (1 - k) + k))),
      Math.round(255 * (1 - Math.min(1, m * (1 - k) + k))),
      Math.round(255 * (1 - Math.min(1, y * (1 - k) + k)))
    ];
  }

  return {
    PRIMARIES: PRIMARIES,
    getMatrices: getMatrices,
    rgbToHsv: rgbToHsv,
    hsvToRgb: hsvToRgb,
    rgbToXyz: rgbToXyz,
    xyzToLab: xyzToLab,
    labToXyz: labToXyz,
    xyzToRgb: xyzToRgb,
    rgbToLab: rgbToLab,
    labToRgb: labToRgb,
    rgbToCmyk: rgbToCmyk,
    cmykToRgb: cmykToRgb
  };
})();


if (typeof module !== 'undefined') module.exports = Model;
