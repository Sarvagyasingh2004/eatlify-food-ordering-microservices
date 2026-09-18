import type { EarningsRange } from "../types";

const RANGES: { key: EarningsRange, label: string }[] = [
    { key: "today", label: "Today" },
    { key: "7d", label: "7 days" },
    { key: "30d", label: "30 days" },
    { key: "all", label: "All time" },
];

interface Props {
    value: EarningsRange;
    onChange: (range: EarningsRange) => void;
}

const RangeTabs = ({ value, onChange }: Props) => (
    <div className="flex flex-wrap gap-2">
        {RANGES.map((range) => (
            <button
                key={range.key}
                onClick={() => onChange(range.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${value === range.key
                    ? "bg-[#E23744] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
                {range.label}
            </button>
        ))}
    </div>
);

export default RangeTabs;
