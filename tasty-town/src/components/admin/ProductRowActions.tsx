"use client";
import { ArrowDown, ArrowUp } from "lucide-react";
import { ActionForm, SubmitButton } from "./ActionForm";
import { archiveProduct, duplicateProduct, moveProduct, toggleProduct } from "@/app/admin/(panel)/products/actions";

const Hidden = ({ id }: { id: string }) => <input type="hidden" name="id" value={id} />;

export function ToggleChip({ id, field, on, onLabel, offLabel }: { id: string; field: string; on: boolean; onLabel: string; offLabel: string }) {
  return (
    <ActionForm action={toggleProduct}>
      <Hidden id={id} /><input type="hidden" name="field" value={field} /><input type="hidden" name="value" value={String(!on)} />
      <SubmitButton className={`!min-h-8 !px-3 !text-xs ${on ? "bg-lime text-ink" : "border border-line bg-white text-muted"}`}>{on ? onLabel : offLabel}</SubmitButton>
    </ActionForm>
  );
}
export function MoveButtons({ id }: { id: string }) {
  return (
    <div className="flex gap-1">
      {(["up", "down"] as const).map((d) => (
        <ActionForm key={d} action={moveProduct}><Hidden id={id} /><input type="hidden" name="dir" value={d} />
          <button aria-label={`Move ${d}`} className="flex size-8 items-center justify-center rounded-lg border border-line">{d === "up" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}</button></ActionForm>
      ))}
    </div>
  );
}
export function DuplicateButton({ id }: { id: string }) {
  return <ActionForm action={duplicateProduct}><Hidden id={id} /><SubmitButton className="!min-h-8 border border-line bg-white !px-3 !text-xs">Duplicate</SubmitButton></ActionForm>;
}
export function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  return <ActionForm action={archiveProduct}><Hidden id={id} /><input type="hidden" name="archive" value={String(!archived)} />
    <SubmitButton confirm={archived ? undefined : "Archive this product? It will be hidden from customers. Past orders are not affected."} className="!min-h-8 border border-line bg-white !px-3 !text-xs">{archived ? "Restore" : "Archive"}</SubmitButton></ActionForm>;
}
