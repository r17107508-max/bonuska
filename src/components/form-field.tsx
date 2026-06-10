export function FormField({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  defaultValue,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string | number | null;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
      />
    </label>
  );
}

export function TextAreaField({
  label,
  name,
  placeholder,
  defaultValue,
  rows = 4,
  required = false,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string | null;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string | null;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? options[0]?.value}
        className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
