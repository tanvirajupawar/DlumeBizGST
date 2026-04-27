const StatusBadge = ({ status }) => {
  let style = "";
  let label = "";

  if (status === "Paid") {
    style = "bg-green-50 text-green-700";
    label = "Paid";
  } else if (status === "Partial") {
    style = "bg-blue-50 text-blue-700";
    label = "Partial";
  } else {
    style = "bg-red-50 text-red-600";
    label = "Unpaid";
  }

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${style}`}>
      {label}
    </span>
  );
};

export default StatusBadge;