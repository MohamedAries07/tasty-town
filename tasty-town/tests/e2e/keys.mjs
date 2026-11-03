import { createHmac } from "node:crypto";
export const SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";
const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
export const sign = (claims) => { const h = `${b({ alg: "HS256", typ: "JWT" })}.${b({ iss: "test", iat: 1700000000, exp: 4102444800, ...claims })}`; return `${h}.${createHmac("sha256", SECRET).update(h).digest("base64url")}`; };
export const ANON = sign({ role: "anon" }), SERVICE = sign({ role: "service_role" });
if (process.argv[2] === "anon") console.log(ANON); if (process.argv[2] === "service") console.log(SERVICE);
