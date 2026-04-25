import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { FiPlus } from "react-icons/fi";
import { TbWallet } from "react-icons/tb";

import Table from "../../components/Table";
import Button from "../../components/Button";
import Modal from "../../components/Modal";
import PaymentSuccessScreen from "../Payment/PaymentSuccessScreen";



const columns = [
  { key: "sr", label: "Sr No" },
  { key: "name", label: "Customer Name" },
  { key: "company", label: "Company" },
  { key: "address", label: "Address" },
  { key: "phone", label: "Phone" },
  { key: "outstanding", label: "Outstanding" },
];

const CustomerList = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);

useEffect(() => {
  fetchCustomers();
}, []);

const fetchCustomers = async () => {
  try {
    const res = await axios.get("http://localhost:8000/api/customers");

    if (res.data.success) {
      setCustomers(res.data.data);
    }
  } catch (err) {
    console.error(err);
  }
};

  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [remark, setRemark] = useState("");

  // ✅ New: payment success state
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedPayment, setSavedPayment] = useState(null);

  const handleSavePayment = () => {
    const today = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // Save payment details for success screen
    setSavedPayment({
      amount: paymentAmount,
      method: paymentMode,
      date: today,
      customer: {
        first_name: selectedCustomer?.name?.split(" ")[0] || "",
        last_name: selectedCustomer?.name?.split(" ").slice(1).join(" ") || "",
        contact_no_1: selectedCustomer?.phone || "",
      },
    });

    // Close modal, show success screen
    setShowPayModal(false);
    setShowSuccess(true);
  };

  const handleSuccessDone = () => {
    setShowSuccess(false);
    setSavedPayment(null);
    setPaymentAmount("");
    setPaymentMode("Cash");
    setRemark("");
    setSelectedCustomer(null);
  };

  // ✅ Show full-screen success page
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

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-end">
  

     
      </div>

      {/* Customer Table */}
    <Table
  columns={columns}
data={customers.map((c, index) => ({
  sr: index + 1,
  id: c._id,
  name: `${c.first_name} ${c.last_name}`,
  company: c.company_name,
  address: c.customer_address_line1,
  phone: c.customer_phone,
  outstanding: "₹0",
}))}
  searchPlaceholder="Search customers..."

  headerActions={
    <Button
      variant="navy"
      size="sm"
      className="flex items-center gap-2"
      onClick={() => navigate("/customers")}
    >
      <FiPlus size={14} />
      Add Customer
    </Button>
  }

  onRowClick={(row) => navigate(`/customers/${row.id}`)}

  renderActions={(row) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setSelectedCustomer(row);
        setShowPayModal(true);
      }}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-green-600 border border-green-200 hover:bg-green-50 transition"
    >
      <TbWallet size={15} />
      Pay
    </button>
  )}

  onDelete={(row) => console.log("Delete customer:", row)}
/>

      {/* Payment Modal */}
      {showPayModal && (
        <Modal title="Receive Payment" onClose={() => setShowPayModal(false)}>
          <div className="space-y-4">

            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{selectedCustomer?.name}</p>
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

export default CustomerList;