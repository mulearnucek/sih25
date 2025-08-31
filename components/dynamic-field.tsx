"use client"

type Field = {
  key: string
  label: string
  type: "text" | "select"
  required?: boolean
  options?: string[]
  placeholder?: string
}

export function DynamicField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: Field
  value: string
  onChange: (k: string, v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700" htmlFor={field.key}>
        {field.label} {field.required ? <span className="text-red-600">*</span> : null}
      </label>
      {field.type === "select" ? (
        <select
          id={field.key}
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          disabled={disabled}
          className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select {field.label}</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={field.key}
          type="text"
          value={value || ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          disabled={disabled}
          placeholder={field.placeholder}
          className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  )
}
