import { CalendarRange, ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DATE_RANGE_PRESETS,
  DATE_RANGE_PRESET_LABELS,
  type DateRangePreset,
} from "@/types/notifications";

interface NotificationFiltersProps {
  datePreset: DateRangePreset;
  filtersActive: boolean;
  onDatePresetChange: (value: DateRangePreset) => void;
  onReset: () => void;
}

// Sits inline on the tab row (opposite side), not its own bordered bar —
// the parent (NotificationsViewAllModal) owns that layout.
export function NotificationFilters({
  datePreset,
  filtersActive,
  onDatePresetChange,
  onReset,
}: NotificationFiltersProps) {
  return (
    <div className="flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="min-w-[9rem] justify-between font-normal"
              aria-label="Date range"
            />
          }
        >
          <span className="flex items-center gap-1.5 truncate">
            <CalendarRange className="size-3.5 text-muted-foreground" />
            {DATE_RANGE_PRESET_LABELS[datePreset]}
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuRadioGroup
            value={datePreset}
            onValueChange={(value) => onDatePresetChange(value as DateRangePreset)}
          >
            {DATE_RANGE_PRESETS.map((preset) => (
              <DropdownMenuRadioItem key={preset} value={preset} closeOnClick>
                {DATE_RANGE_PRESET_LABELS[preset]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onReset}
        disabled={!filtersActive}
        aria-label="Reset filters"
        title="Reset filters"
        className="size-8 shrink-0 text-muted-foreground"
      >
        <RotateCcw className="size-4" />
      </Button>
    </div>
  );
}
