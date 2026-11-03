type Bar = { label: string; value: number; secondary?: number };

/** Plain SVG chart rendered on the server. A hidden table gives screen readers the same data. */
export function BarChart({ title, bars, format, secondaryName, primaryName = "Value" }: { title: string; bars: Bar[]; format: (n: number) => string; secondaryName?: string; primaryName?: string }) {
  const W = 640, Hh = 190, top = 14, bottom = 26, n = Math.max(bars.length, 1), slot = (W - 16) / n;
  const max = Math.max(...bars.map((b) => Math.max(b.value, b.secondary ?? 0)), 0), plot = Hh - top - bottom, step = Math.ceil(n / 8);
  const h = (v: number) => (max === 0 ? 0 : Math.max(v > 0 ? 1.5 : 0, (v / max) * plot));
  return (
    <figure className="space-y-1 rounded-xl border border-line bg-white p-3">
      <figcaption className="flex items-baseline justify-between gap-2 text-sm font-bold"><span>{title}</span><span className="text-xs font-normal text-muted">{max > 0 ? `Peak ${format(max)}` : "No data"}</span></figcaption>
      <svg viewBox={`0 0 ${W} ${Hh}`} role="img" aria-label={`${title}. ${max > 0 ? `Peak ${format(max)}.` : "No data in this period."}`} className="h-auto w-full">
        <line x1="8" x2={W - 8} y1={Hh - bottom} y2={Hh - bottom} stroke="#e8e8e5" />
        {bars.map((b, i) => { const x = 8 + i * slot, w = slot * 0.7, bx = x + slot * 0.15; return (
          <g key={i}>
            {b.secondary !== undefined && <rect x={bx} y={Hh - bottom - h(b.secondary)} width={w} height={h(b.secondary)} fill="#e8e8e5"><title>{`${b.label}: ${format(b.secondary)}${secondaryName ? ` ${secondaryName}` : ""}`}</title></rect>}
            <rect x={bx} y={Hh - bottom - h(b.value)} width={w} height={h(b.value)} fill="#101010"><title>{`${b.label}: ${format(b.value)}`}</title></rect>
            {(i % step === 0 || (i === n - 1 && i % step >= Math.ceil(step / 2))) && <text x={x + slot / 2} y={Hh - 8} textAnchor="middle" fontSize="11" fill="#737373">{b.label}</text>}
          </g>); })}
      </svg>
      {secondaryName && <p className="flex gap-3 text-xs text-muted"><span><span className="mr-1 inline-block size-2 bg-[#e8e8e5]" />{secondaryName}</span><span><span className="mr-1 inline-block size-2 bg-ink" />{primaryName}</span></p>}
      <table className="sr-only"><caption>{title}</caption><thead><tr><th>Period</th><th>{primaryName}</th>{secondaryName && <th>{secondaryName}</th>}</tr></thead>
        <tbody>{bars.map((b, i) => <tr key={i}><td>{b.label}</td><td>{format(b.value)}</td>{secondaryName && <td>{format(b.secondary ?? 0)}</td>}</tr>)}</tbody></table>
    </figure>
  );
}
