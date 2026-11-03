"use client";
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en"><body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "96px 24px" }}>
      <h1>Something went wrong</h1><p>Please try again.</p>
      <button onClick={reset} style={{ height: 48, padding: "0 28px", border: 0, borderRadius: 12, background: "#B8F52A", fontWeight: 700 }}>Reload</button>
    </body></html>
  );
}
