// Copies the PDF / ZIP / QR / barcode libraries into www/vendor so the app works 100% offline.
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', 'www', 'vendor');
fs.mkdirSync(out, { recursive: true });
const files = [
  'pdf-lib/dist/pdf-lib.min.js',
  'pdfjs-dist/build/pdf.min.js',
  'pdfjs-dist/build/pdf.worker.min.js',
  'jszip/dist/jszip.min.js',
  'qrcode-generator/qrcode.js',
  'jsbarcode/dist/JsBarcode.all.min.js'
];
for (const f of files) {
  const src = require.resolve(f);
  fs.copyFileSync(src, path.join(out, path.basename(f)));
  console.log('vendor:', path.basename(f));
}
