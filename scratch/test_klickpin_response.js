async function testKlickpin() {
  const form = new URLSearchParams();
  form.append("url", "https://pin.it/60m8aXr85");
  const res = await fetch("https://klickpin.com/en5/download", {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("HTML length:", text.length);
  const mp4s = text.match(/https?:\/\/[^"'\s\\]+\.mp4[^"'\s\\]*/g);
  console.log("Klickpin MP4s:", mp4s ? [...new Set(mp4s)] : "none");

  // Check download links or buttons
  const aTags = text.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi);
  for (const a of aTags) {
    if (a[2].toLowerCase().includes('download') || a[1].includes('download')) {
      console.log("Download link:", a[1], "Text:", a[2].replace(/<[^>]+>/g, '').trim());
    }
  }
}
testKlickpin().catch(console.error);
