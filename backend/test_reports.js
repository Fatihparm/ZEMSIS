const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType, BorderStyle, PageBreak, TableOfContents, VerticalAlign, TextDirection, Header, Footer } = require('docx');
const fs = require('fs');

const code = fs.readFileSync('reports.js', 'utf8');
const buildReportDOCXStr = code.match(/function buildReportDOCX\([\s\S]*?\n\}/)[0];
const createListParagraphsStr = code.match(/function createListParagraphs\([\s\S]*?\n\}/)[0];
const createDataTableStr = code.match(/function createDataTable\([\s\S]*?\n\}/)[0];
const fmtNumStr = code.match(/function fmtNum\([\s\S]*?\n\}/)[0];
const createParagraphsStr = code.match(/function createParagraphs\([\s\S]*?\n\}/)[0];
const getSecStr = code.match(/function getSec\([\s\S]*?\n\}/)[0];

eval(getSecStr);
eval(createParagraphsStr);
eval(fmtNumStr);
eval(createDataTableStr);
eval(createListParagraphsStr);
eval(buildReportDOCXStr);

async function test() {
  try {
    const doc = buildReportDOCX({ project: {id: 1, name: "Test"}, lockedParams: {}, lockedResults: {}, sections: {} });
    await Packer.toBuffer(doc);
    console.log("Success Packer!");
  } catch (e) {
    console.error(e);
  }
}
test();
