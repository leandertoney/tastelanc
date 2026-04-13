'use client';

interface TrafficTypeSelectorProps {
  value: string; // 'all', 'web', or 'app'
  onChange: (type: string) => void;
}

export default function TrafficTypeSelector({ value, onChange }: TrafficTypeSelectorProps) {
  const options = [
    { value: 'all', label: 'All Traffic' },
    { value: 'web', label: 'Web Only' },
    { value: 'app', label: 'App Only' },
  ];

  return (
    <div className="flex bg-tastelanc-surface rounded-lg p-1 gap-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
            value === option.value
              ? 'bg-tastelanc-accent text-white font-medium'
              : 'text-tastelanc-text-muted hover:text-tastelanc-text-primary'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
