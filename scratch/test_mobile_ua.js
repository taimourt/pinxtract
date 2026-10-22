async function testMobile() {
  const res = await fetch("https://pin.it/60m8aXr85", {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    redirect: "follow"
  });
  const text = await res.text();
  console.log("Mobile HTML length:", text.length);
  const ogVideo = text.match(/<meta property="og:video"[^>]*content="([^"]*)"/i);
  console.log("Mobile og:video:", ogVideo ? ogVideo[1] : "none");
  const videoSnippet = text.match(/<script data-test-id="video-snippet"[^>]*>([\s\S]*?)<\/script>/i);
  console.log("Mobile videoSnippet found:", !!videoSnippet);
  const mp4s = text.match(/https?:\/\/[^"'\s\\]+\.mp4/g) || [];
  console.log("Mobile MP4s:", [...new Set(mp4s)]);
}
testMobile().catch(console.error);
