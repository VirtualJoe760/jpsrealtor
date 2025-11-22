"use client";

interface EmailSubscribeProps {
  label: string;
  isChecked: boolean; // This property ensures the component knows its checked state
  onChange: (checked: boolean) => void; // Callback to handle state changes
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
        required
      />
      <label htmlFor="email-opt-in" className="ml-2 text-sm text-gray-300">
        {label}
      </label>
    </div>
  );
}
