const { extractPinterestMedia } = require('../pinterestScraper');

// Let's test a variety of Pinterest video URLs
const testUrls = [
  "https://pin.it/60m8aXr85",
  "https://www.pinterest.com/pin/795377984215165340/",
  "https://www.pinterest.com/pin/6874778393529891/",
  "https://www.pinterest.com/pin/1146799555138138243/",
  "https://www.pinterest.com/pin/2955555998795893/"
];

async function testAll() {
  for (const url of testUrls) {
    try {
      console.log("\n==================================");
      console.log("Testing:", url);
      const res = await extractPinterestMedia(url);
      console.log("Type detected:", res.type);
      console.log("Title:", res.title);
      console.log("Media items:", res.media.map(m => `${m.type}: ${m.quality} (${m.format}) -> ${m.url.slice(0, 50)}...`));
    } catch (e) {
      console.log("Error:", e.message);
    }
  }
}

testAll();
