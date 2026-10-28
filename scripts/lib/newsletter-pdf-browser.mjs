import { spawn } from "node:child_process";

// Real-time Chromium for asynchronous canvas/image exports. Virtual time may
// expire while foreignObject images are still decoding, despite valid layouts.
export async function waitForNewsletterPdf(chrome, url) {
  const child = spawn(chrome, ["--headless", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1", "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  let socket;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let log = "";
      const timer = setTimeout(() => reject(new Error("Chromium startup timeout")), 15000);
      child.once("error", error => { clearTimeout(timer); reject(error); });
      child.stderr.on("data", chunk => {
        log += String(chunk);
        const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0;
    const pending = new Map();
    socket.onmessage = event => { const response = JSON.parse(event.data); const callback = pending.get(response.id); if (callback) { pending.delete(response.id); if (response.error) callback.reject(new Error(response.error.message)); else callback.resolve(response.result); } };
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    await send("Page.enable", {}, sessionId);
    await send("Page.navigate", { url }, sessionId);
    // Multi-page exports with many images can need longer on slow machines.
    const deadline = Date.now() + (Number(process.env.NEWSLETTER_PDF_TIMEOUT_MS) || 50000);
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const result = await send("Runtime.evaluate", { expression: "document.body?.textContent || ''", returnByValue: true }, sessionId).catch(() => null);
      const text = result?.result?.value ?? "";
      if (text.startsWith("FAIL:")) throw new Error(text);
      if (text.startsWith("PDF PASS:")) { await send("Browser.close"); return text; }
    }
    throw new Error("PDF export timed out: " + url);
  } finally { socket?.close(); child.kill(); }
}
