export function Button({ children, loading = false, variant = 'primary', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-violet-600 hover:bg-violet-700 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
    ghost: 'hover:bg-gray-100 text-gray-600',
  }

  return (
    <button className={`${base} ${variants[variant]}`} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
      {children}
    </button>
  )
}
