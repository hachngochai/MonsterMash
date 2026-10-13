/* Load the same Vietnamese font for the interface and Canvas before drawing. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const sans = '"Noto Sans", Arial, sans-serif';
  const serif = '"Noto Serif", Georgia, serif';
  const sample = 'Ánh đèn đầu tiên · Ắ Ằ Ẳ Ẵ Ặ Ấ Ầ Ẩ Ẫ Ậ Ế Ề Ể Ễ Ệ Ố Ồ Ổ Ỗ Ộ Ớ Ờ Ở Ỡ Ợ Ứ Ừ Ử Ữ Ự Ỳ Ỵ Ỷ Ỹ Đ';
  const fonts = root.document?.fonts;
  const ready = fonts ? Promise.all([
    ...[400, 500, 600, 700, 800].map(weight => fonts.load(`${weight} 16px "Noto Sans"`, sample)),
    ...[400, 700, 900].map(weight => fonts.load(`${weight} 16px "Noto Serif"`, sample))
  ]).then(() => fonts.ready).catch(() => { /* Browser fallback keeps the game playable if a font cannot load. */ }) : Promise.resolve();
  MM.Typography = { sans, serif, ready };
})(typeof window === 'undefined' ? globalThis : window);
