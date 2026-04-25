import clsx from "clsx";

const Card = ({
  title,
  subtitle,
  children,
  className,
  headerRight,
  padding = "p-6",
}) => {
  return (
    <div
      className={clsx(
        "bg-white rounded-2xl border border-gray-200 shadow-sm",
        padding,
        className
      )}
    >
      {(title || headerRight) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-gray-800">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>

          {headerRight && <div>{headerRight}</div>}
        </div>
      )}

      {children}
    </div>
  );
};

export default Card;