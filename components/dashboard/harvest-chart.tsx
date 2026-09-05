"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { HarvestPoint } from "@/lib/api/dashboard";

/**
 * Single-series magnitude over time → bars, one brand hue, no legend (the
 * heading names the series). Values appear on the peak bar and on tap/hover.
 */
export function HarvestChart({ data }: { data: HarvestPoint[] }) {
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(...data.map((d) => d.tons), 0);
  // Round the axis top up to a clean step so gridlines read as round numbers.
  const step = niceStep(max);
  const top = Math.max(step * 4, step);
  const peakIndex = data.reduce((best, d, i) => (d.tons > data[best].tons ? i : best), 0);

  const gridValues = [4, 3, 2, 1, 0].map((i) => (top / 4) * i);

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex h-40 w-8 shrink-0 flex-col justify-between py-px text-right text-[10px] text-muted">
          {gridValues.map((value) => (
            <span key={value}>{formatTons(value)}</span>
          ))}
        </div>

        <div className="relative h-40 flex-1">
          {gridValues.map((value, i) => (
            <span
              key={value}
              className={cn(
                "absolute inset-x-0 border-t",
                i === gridValues.length - 1 ? "border-line" : "border-line/60",
              )}
              style={{ top: `${(i / (gridValues.length - 1)) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-2">
            {data.map((point, index) => {
              const height = top > 0 ? (point.tons / top) * 100 : 0;
              const isActive = active === index;
              const showValue = isActive || (active === null && index === peakIndex && point.tons > 0);

              return (
                <button
                  key={point.month}
                  type="button"
                  aria-label={`${point.month}: ${formatTons(point.tons)} tons`}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive((prev) => (prev === index ? null : index))}
                  className="group relative flex h-full flex-1 items-end justify-center"
                >
                  {showValue ? (
                    <span
                      className="absolute z-10 -translate-y-1 rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-white"
                      style={{ bottom: `${Math.min(height, 88)}%` }}
                    >
                      {formatTons(point.tons)}t
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "w-full rounded-t-[4px] transition-colors",
                      point.tons === 0
                        ? "h-0.5 bg-line"
                        : isActive
                          ? "bg-brand-700"
                          : "bg-brand-600",
                    )}
                    style={point.tons === 0 ? undefined : { height: `${Math.max(height, 2)}%` }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-2 flex gap-2 pl-10">
        {data.map((point, index) => (
          <span
            key={point.month}
            className={cn(
              "flex-1 text-center text-[11px]",
              active === index ? "font-semibold text-ink" : "text-muted",
            )}
          >
            {point.month}
          </span>
        ))}
      </div>
    </div>
  );
}

function niceStep(max: number) {
  if (max <= 0) return 1;
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const snapped = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return snapped * magnitude;
}

function formatTons(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
