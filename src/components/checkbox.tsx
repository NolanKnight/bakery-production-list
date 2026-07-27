import { Check, Minus } from "lucide-react";
import { ChangeEvent } from "react";

export default function Checkbox({state, onChange}: {state: {allSelected: boolean, partiallySelected: boolean} | boolean, onChange: (e: ChangeEvent<HTMLInputElement, HTMLInputElement>) => void }) {
  return (
    <>
                            <input
                              type="checkbox"
                              className="relative peer shrink-0 appearance-none w-4 h-4 border-accent hover:bg-accent-foreground border rounded-none checked:bg-primary indeterminate:bg-primary checked:hover:bg-primary/80 checked:border-none"
                              checked={typeof state === "boolean" ? state : state.allSelected}
                              ref={(node) => {
                                if (node) {
                                  node.indeterminate = typeof state === "boolean" ? false : state.partiallySelected;
                                }
                              }}
                              onChange={onChange}
                            />
                            <Check className="absolute w-4 h-4 hidden peer-checked:block text-white pointer-events-none" />
                            <Minus className="absolute w-4 h-4 hidden peer-indeterminate:block text-white pointer-events-none" />
    </>
  );
}