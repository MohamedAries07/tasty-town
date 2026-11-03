import type { FoodType } from "@/types";

const LABEL: Record<FoodType, string> = { veg: "Vegetarian", non_veg: "Non-vegetarian", egg: "Contains egg" };
const COLOR: Record<FoodType, string> = { veg: "#1a8f3c", non_veg: "#c4301c", egg: "#d98a00" };

/** Indian food-labelling mark: bordered square with a dot. */
export function FoodTypeMark({ type }: { type: FoodType }) {
  return (
    <span role="img" aria-label={LABEL[type]} title={LABEL[type]}
      className="inline-flex size-4 shrink-0 items-center justify-center border-[1.5px]" style={{ borderColor: COLOR[type] }}>
      <span className="size-2 rounded-full" style={{ background: COLOR[type] }} />
    </span>
  );
}
