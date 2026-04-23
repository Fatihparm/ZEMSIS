import https from 'https';
import fs from 'fs';

const url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Regular.ttf';
https.get(url, (res) => {
  let chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    let buffer = Buffer.concat(chunks);
    let base64 = buffer.toString('base64');
    let js = `export const robotoBase64 = '${base64}';`;
    fs.writeFileSync('src/utils/roboto-font.js', js);
    console.log('Font saved!');
  });
}).on('error', (e) => {
  console.error(e);
});
