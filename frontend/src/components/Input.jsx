import clsx from "clsx";

const Input = ({
  label,
  icon: Icon,
  rightIcon: RightIcon,
  error,
  size = "md",
  as = "input",
  children,
  className,
  ...props
}) => {

  const sizeStyles = {
    sm: "py-1.5 px-3 text-sm rounded-lg",
    md: "py-3 px-4 text-sm rounded-xl",
    lg: "py-4 px-5 text-base rounded-xl",
  };

  const baseStyles = clsx(
    "w-full bg-white border border-gray-300 outline-none transition-all duration-200",
    sizeStyles[size],
    Icon && "pl-10",
    RightIcon && "pr-10",
    "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
    error && "border-red-500 focus:ring-red-500",
    className
  );

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
        )}

        {as === "select" ? (
          <select className={baseStyles} {...props}>
            {children}
          </select>
        ) : as === "textarea" ? (
          <textarea className={baseStyles} {...props} />
        ) : (
          <input className={baseStyles} {...props} />
        )}

        {RightIcon && (
          <RightIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer text-lg" />
        )}
      </div>

      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
};

export default Input;