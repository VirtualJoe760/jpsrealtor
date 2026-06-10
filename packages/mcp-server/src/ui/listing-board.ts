// packages/mcp-server/src/ui/listing-board.ts
//
// MCP App (SEP-1865 / ext-apps) UI resource: an interactive "listing board"
// that renders inside Claude (web + desktop). The host pushes the tool result
// to this iframe; we read `structuredContent.listings` and render a card grid.
//
// Why this works where a Claude-generated artifact didn't: the artifact sandbox
// blocks external images (img-src blob: data: https://www.claudeusercontent.com).
// Here the photos arrive as base64 `data:` URIs inside the tool result over the
// MCP postMessage channel — data: is always allowed, so no external fetch, no
// CSP wall. Self-contained (hand-rolled postMessage, no bundler, no imports) so
// it serves as one HTML string. KEEP IT FREE OF backticks and ${} — this whole
// file is embedded as a template literal.

export const LISTING_BOARD_URI = "ui://chatrealty/listing-board.html";
export const LISTING_BOARD_MIME = "text/html;profile=mcp-app";

export const LISTING_BOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<title>ChatRealty Listings</title>
<style>
  :root { --bg:#ffffff; --card:#ffffff; --fg:#0f172a; --muted:#64748b; --border:#e5e7eb; --accent:#2563eb; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0b0d10; --card:#15181d; --fg:#f3f4f6; --muted:#9aa3af; --border:#262b33; --accent:#60a5fa; }
  }
  * { box-sizing: border-box; }
  html, body { margin:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; background:var(--bg); color:var(--fg); }
  .wrap { padding:16px; }
  h1 { font-size:15px; margin:0 0 14px; font-weight:600; letter-spacing:0.01em; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:12px; overflow:hidden; display:flex; flex-direction:column; }
  .thumb { width:100%; aspect-ratio:4/3; object-fit:cover; background:var(--border); display:block; }
  .noimg { width:100%; aspect-ratio:4/3; background:var(--border); display:flex; align-items:center; justify-content:center; color:var(--muted); font-size:12px; }
  .body { padding:10px 12px 12px; display:flex; flex-direction:column; gap:3px; }
  .price { font-size:16px; font-weight:700; }
  .addr { font-size:13px; line-height:1.3; }
  .facts { font-size:12px; color:var(--muted); }
  .view { margin-top:8px; font-size:12px; color:var(--accent); cursor:pointer; background:none; border:none; padding:0; text-align:left; font:inherit; }
  .view:hover { text-decoration:underline; }
  .empty { color:var(--muted); font-size:14px; }
</style>
</head>
<body>
<div class="wrap">
  <h1 id="title">Listings</h1>
  <div class="grid" id="grid"></div>
</div>
<script type="module">
  var nextId = 1;
  var pending = new Map();
  function send(msg){ msg.jsonrpc = "2.0"; window.parent.postMessage(msg, "*"); }
  function request(method, params){ var id = nextId++; return new Promise(function(res, rej){ pending.set(id, { res: res, rej: rej }); send({ id: id, method: method, params: params }); }); }
  function notify(method, params){ send({ method: method, params: params }); }

  function fmtPrice(p){ if (p == null) return ""; return "$" + Number(p).toLocaleString("en-US"); }
  function fmtNum(n){ return Number(n).toLocaleString("en-US"); }
  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function render(toolResult){
    var data = (toolResult && toolResult.structuredContent) || {};
    var listings = Array.isArray(data.listings) ? data.listings : [];
    if (data.title) document.getElementById("title").textContent = data.title;
    var grid = document.getElementById("grid");
    grid.textContent = "";
    if (!listings.length){ grid.appendChild(el("div", "empty", "No listings to show.")); reportSize(); return; }
    for (var i = 0; i < listings.length; i++){
      var l = listings[i];
      var card = el("div", "card");
      if (l.thumb){ var img = document.createElement("img"); img.className = "thumb"; img.src = l.thumb; img.alt = l.address || ""; img.loading = "lazy"; card.appendChild(img); }
      else { card.appendChild(el("div", "noimg", "No photo")); }
      var body = el("div", "body");
      body.appendChild(el("div", "price", fmtPrice(l.price)));
      body.appendChild(el("div", "addr", l.address || ""));
      var facts = [];
      if (l.beds != null) facts.push(l.beds + " bd");
      if (l.baths != null) facts.push(l.baths + " ba");
      if (l.sqft != null) facts.push(fmtNum(l.sqft) + " sqft");
      if (l.yearBuilt != null) facts.push("built " + l.yearBuilt);
      body.appendChild(el("div", "facts", facts.join("  \\u00b7  ")));
      if (l.detailUrl){
        var btn = el("button", "view", "View listing");
        (function(url){ btn.addEventListener("click", function(){ request("ui/open-link", { url: url }).catch(function(){}); }); })(l.detailUrl);
        body.appendChild(btn);
      }
      card.appendChild(body);
      grid.appendChild(card);
    }
    reportSize();
  }

  function reportSize(){ try { notify("ui/notifications/size-changed", { height: document.documentElement.scrollHeight }); } catch (e) {} }

  window.addEventListener("message", function(event){
    if (event.source !== window.parent) return;
    var m = event.data;
    if (!m || m.jsonrpc !== "2.0") return;
    if (m.id !== undefined && (m.result !== undefined || m.error !== undefined)){
      var p = pending.get(m.id);
      if (p){ pending.delete(m.id); if (m.error) p.rej(m.error); else p.res(m.result); }
      return;
    }
    if (m.method === "ui/notifications/tool-result"){ render(m.params); }
  });

  (async function(){
    try { await request("ui/initialize", { appInfo: { name: "ChatRealty Listing Board", version: "1.0.0" }, appCapabilities: {}, protocolVersion: "2026-01-26" }); } catch (e) {}
    notify("ui/notifications/initialized");
  })();
</script>
</body>
</html>`;
