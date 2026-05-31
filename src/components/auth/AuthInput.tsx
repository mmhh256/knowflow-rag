type AuthInputProps = {
  label: string;
  type?: string;
  value: string;
  placeholder: string;
  autoComplete?: string;
  onChange: (value: string) => void;
};

export function AuthInput({
  label,
  type = "text",
  value,
  placeholder,
  autoComplete,
  onChange,
}: AuthInputProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}
