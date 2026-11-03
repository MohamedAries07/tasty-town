"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type Row = { id: string; name: string; price: string };
export function RowsEditor({ prefix, label, priceLabel, initial }: { prefix: string; label: string; priceLabel: string; initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const input = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm";
  const set = (i: number, k: keyof Row, v: string) => setRows((r) => r.map((x, n) => (n === i ? { ...x, [k]: v } : x)));
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold">{label}</legend>
      {rows.map((r, i) => (
        <div key={i} className="flex items-end gap-2">
          <input type="hidden" name={`${prefix}_id`} value={r.id} />
          <div className="flex-1"><label className="sr-only" htmlFor={`${prefix}n${i}`}>Name</label>
            <input id={`${prefix}n${i}`} name={`${prefix}_name`} value={r.name} onChange={(e) => set(i, "name", e.target.value)} placeholder="Name" maxLength={60} className={input} /></div>
          <div className="w-28"><label className="sr-only" htmlFor={`${prefix}p${i}`}>{priceLabel}</label>
            <input id={`${prefix}p${i}`} name={`${prefix}_price`} value={r.price} onChange={(e) => set(i, "price", e.target.value)} placeholder={priceLabel} inputMode="decimal" className={input} /></div>
          <button type="button" aria-label="Remove row" onClick={() => setRows((x) => x.filter((_, n) => n !== i))} className="flex size-10 items-center justify-center rounded-lg border border-line text-[#c4301c]"><Trash2 className="size-4" /></button>
        </div>
      ))}
      <button type="button" onClick={() => setRows((r) => [...r, { id: "", name: "", price: "0" }])} className="flex h-10 items-center gap-2 rounded-lg border border-dashed border-line px-3 text-sm font-medium"><Plus className="size-4" />Add</button>
    </fieldset>
  );
}
