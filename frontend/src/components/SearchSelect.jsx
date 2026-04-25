import Select from "react-select";

export default function SearchSelect({
  value,
  onChange,
  options,
  placeholder
}) {

const formatted = (options || []).map((o) => ({
  value: o.value || o,
  label: o.label || o
}));

  return (
    <Select
      options={formatted}
      value={formatted.find((opt) => opt.value === value) || null}
     onChange={(selected) => onChange(selected ? selected.value : "")}
      placeholder={placeholder}
      isSearchable
      styles={{
        control: (base) => ({
          ...base,
          borderRadius: "8px",
          border: "1.5px solid #e5e7eb",
          minHeight: "38px",
          fontSize: "13px"
        })
      }}
    />
  );
}