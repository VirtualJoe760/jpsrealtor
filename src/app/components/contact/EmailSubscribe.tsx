"use client";

interface EmailSubscribeProps {
  label: string;
  isChecked: boolean;
  onChange: (checked: boolean) => void;
}

export default function EmailSubscribe({ label, isChecked, onChange }: EmailSubscribeProps) {
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id="email-opt-in"
        name="emailOptIn"
        checked={isChecked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <label htmlFor="email-opt-in" className="ml-2 text-sm text-gray-300">
        {label}
      </label>
    </div>
  );
}
