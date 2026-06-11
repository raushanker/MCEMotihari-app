const { PDFDocument, PDFName, PDFDict, PDFStream } = require('pdf-lib');
const fs = require('fs');

async function test() {
  const pdfBytes = fs.readFileSync('sample.pdf'); // Assuming sample.pdf exists or we can create one
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const pages = pdfDoc.getPages();
  pages.forEach((page, idx) => {
    const xObject = page.node.Resources().XObject();
    if (xObject) {
      console.log(`Page ${idx} has XObjects`);
    }
  });
}

test().catch(console.error);
