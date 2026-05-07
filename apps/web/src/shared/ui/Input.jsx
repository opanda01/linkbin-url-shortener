export function Input({ label, error, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      ) : null}
      <input
        className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors
          focus:ring-2 focus:ring-violet-500 focus:border-violet-500
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
        {...props}
      />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  )
}
