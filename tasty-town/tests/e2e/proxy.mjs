// Minimal stand-in for Supabase's gateway: maps /rest/v1/* to PostgREST. Auth and storage are intentionally absent.
import http from "node:http";
const target = Number(process.env.POSTGREST_PORT ?? 3000);
const decode = (t) => { try { return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()); } catch { return null; } };
const json = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const user = (sub) => ({ id: sub, aud: "authenticated", role: "authenticated", email: `${sub.slice(-4)}@test.local`, app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" });
http.createServer((req, res) => {
  // Stand-ins for the parts of Supabase Auth and Storage the admin pages call.
  if (req.url.startsWith("/auth/v1/user")) { const c = decode((req.headers.authorization ?? "").replace("Bearer ", "")); return c?.sub ? json(res, 200, user(c.sub)) : json(res, 401, { msg: "invalid" }); }
  if (req.url.startsWith("/auth/v1/admin/users/")) return json(res, 200, user(req.url.split("/").pop()));
  if (req.url.startsWith("/storage/v1/object/list/")) return json(res, 200, []);
  if (!req.url.startsWith("/rest/v1/")) { res.writeHead(404, { "Content-Type": "application/json" }); return res.end("{}"); }
  const p = http.request({ host: "127.0.0.1", port: target, path: req.url.slice("/rest/v1".length), method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on("error", () => { res.writeHead(502); res.end(); });
  req.pipe(p);
}).listen(Number(process.env.PORT ?? 54321), "127.0.0.1");
