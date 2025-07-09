export const Button = ({ children, className = '', ...props }) => (
  <button
    className={`rounded-lg px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition ${className}`}
    {...props}
  >
    {children}
  </button>
);