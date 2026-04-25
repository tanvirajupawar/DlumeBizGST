import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { FiPlus } from "react-icons/fi";
import { TbWallet } from "react-icons/tb";

import Table from "../../components/Table";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import PaymentSuccessScreen from "../Payment/PaymentSuccessScreen";


const columns = [
  { key: "sr", label: "Sr No" },
  { key: "name", label: "Vendor Name" },
  { key: "company", label: "Company" },
  { key: "address", label: "Address" },
  { key: "phone", label: "Phone" },
  { key: "payable", label: "Payable" },
];

const VendorList = () => {
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [remark, setRemark] = useState("");

  const [showSuccess, setShowSuccess] = useState(false);
  const [savedPayment, setSavedPayment] = useState(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/vendor");

      if (res.data.success) {
        setVendors(res.data.data);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayment = () => {
    const today = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    setSavedPayment({
      amount: paymentAmount,
      method: paymentMode,
      date: today,
      customer: {
        first_name: selectedVendor?.name || "",
        last_name: "",
        contact_no_1: selectedVendor?.phone || "",
      },
    });

    setShowPayModal(false);
    setShowSuccess(true);
  };

  const handleSuccessDone = () => {
    setShowSuccess(false);
    setSavedPayment(null);
    setPaymentAmount("");
    setPaymentMode("Cash");
    setRemark("");
    setSelectedVendor(null);
  };

  if (showSuccess && savedPayment) {
    return (
      <PaymentSuccessScreen
        amount={savedPayment.amount}
        method={savedPayment.method}
        date={savedPayment.date}
        customer={savedPayment.customer}
        onDone={handleSuccessDone}
      />
    );
  }
  


if (loading) {
  return (
    <div className="p-6 text-gray-500 text-sm">
      Loading vendors...
    </div>
  );
}
  return (
    <div className="space-y-6">

  
      {/* Vendor Table */}
 <Table
  columns={columns}
data={vendors.map((v, index) => ({
  id: v._id,
  sr: index + 1,
  name: v.vendor_name || "-",
  company: v.company_name || "-",
address: (
  <div className="leading-tight">
    <div>
      {[v.address_line_1, v.address_line_2]
        .filter(Boolean)
        .join(", ") || "-"}
    </div>

    <div className="text-xs text-gray-500">
      {[v.city, v.state]
        .filter(Boolean)
        .join(", ")}
      {v.pincode ? ` - ${v.pincode}` : ""}
    </div>
  </div>
),

phone: v.contact_no_1 || "-",        
  payable: `₹${(v.pending_amount || 0).toLocaleString("en-IN")}`,
}))}

  searchPlaceholder="Search vendors..."

  headerActions={
    <Button
      variant="navy"
      size="sm"
      className="flex items-center gap-2"
      onClick={() => navigate("/vendors")}
    >
      <FiPlus size={14} />
      Add Vendor
    </Button>
  }

  onRowClick={(row) => navigate(`/vendors/${row.id}`)}

  renderActions={(row) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setSelectedVendor(row);
        setShowPayModal(true);
      }}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-green-600 border border-green-200 hover:bg-green-50 transition"
    >
      <TbWallet size={15} />
      Pay
    </button>
  )}

onDelete={async (row) => {
  const confirmDelete = window.confirm("Are you sure you want to delete this vendor?");
  if (!confirmDelete) return;

  try {
    await axios.delete(`http://localhost:8000/api/vendor/${row.id}`);

    // remove from UI instantly
    setVendors((prev) => prev.filter((v) => v._id !== row.id));

    alert("Vendor deleted successfully");
  } catch (err) {
    console.error(err);
    alert("Failed to delete vendor");
  }
}}/>

      {/* Payment Modal */}
      {showPayModal && (
        <Modal title="Pay Vendor" onClose={() => setShowPayModal(false)}>
          <div className="space-y-4">

            <div>
              <p className="text-sm text-gray-500">Vendor</p>
              <p className="font-medium">{selectedVendor?.name}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500">Amount</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-500">Remark</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows="3"
                placeholder="Add note or remark..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowPayModal(false)}
                className="px-4 py-2 text-sm border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleSavePayment}
                className="px-4 py-2 text-sm bg-[#1e3a8a] text-white rounded-lg"
              >
                Save Payment
              </button>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
};

export default VendorList;