import React, { useEffect, useState } from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');

  .ps-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 48px 24px;
  }

  .ps-wrapper {
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .ps-icon-circle {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: #E6F4EA;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;
    transform: scale(0);
    opacity: 0;
    transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
  }
  .ps-icon-circle.visible {
    transform: scale(1);
    opacity: 1;
  }
  .ps-check-icon {
    font-size: 42px;
    color: #16A34A;
    font-weight: bold;
    line-height: 1;
  }

  .ps-title-block {
    text-align: center;
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .ps-title-block.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .ps-title {
    font-size: 22px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 6px;
    font-family: 'DM Sans', sans-serif;
  }
  .ps-subtitle {
    font-size: 14px;
    color: #6B7280;
    text-align: center;
    margin-bottom: 24px;
    font-family: 'DM Sans', sans-serif;
  }

  .ps-card {
    width: 100%;
    background: #FFFFFF;
    padding: 20px;
    border-radius: 14px;
    border: 1px solid #E5E7EB;
    margin-bottom: 24px;
    opacity: 0;
    transform: translateY(14px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .ps-card.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .ps-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .ps-row:last-child {
    margin-bottom: 0;
  }
  .ps-label {
    font-size: 13px;
    color: #6B7280;
    font-family: 'DM Sans', sans-serif;
  }
  .ps-value {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    font-family: 'DM Sans', sans-serif;
  }
  .ps-amount {
    font-size: 16px;
    font-weight: 700;
    color: #16A34A;
    font-family: 'DM Mono', monospace;
  }

  .ps-btn-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  .ps-btn-block.visible {
    opacity: 1;
  }
  .ps-done-btn {
    background: #2563EB;
    color: #FFFFFF;
    font-weight: 600;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    padding: 14px 40px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    margin-bottom: 14px;
    width: 100%;
    transition: background 0.2s ease, transform 0.1s ease;
  }
  .ps-done-btn:hover { background: #1D4ED8; }
  .ps-done-btn:active { transform: scale(0.98); }
  .ps-back-btn {
    background: none;
    border: none;
    font-size: 13px;
    color: #2563EB;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
  }
  .ps-back-btn:hover { text-decoration: underline; }
`;

export default function PaymentSuccessScreen({
  amount = "1,500",
  method = "UPI",
  date = "09 Mar 2026",
  customer = { first_name: "Rahul", last_name: "Sharma", contact_no_1: "9876543210" },
  onDone,
  onBack,
}) {
  const [iconVisible, setIconVisible] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [btnVisible, setBtnVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setIconVisible(true), 50);
    const t2 = setTimeout(() => setTitleVisible(true), 400);
    const t3 = setTimeout(() => setCardVisible(true), 650);
    const t4 = setTimeout(() => setBtnVisible(true), 950);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  const customerLabel = customer?.contact_no_1 ? "Customer" : "Staff";
  const customerName = `${customer?.first_name || "—"} ${customer?.last_name || ""}`.trim();

  return (
    <>
      <style>{styles}</style>
      {/* ✅ No min-height:100vh, no background — fits inside your layout's content area */}
      <div className="ps-container">
        <div className="ps-wrapper">

          <div className={`ps-icon-circle ${iconVisible ? "visible" : ""}`}>
            <span className="ps-check-icon">✓</span>
          </div>

          <div className={`ps-title-block ${titleVisible ? "visible" : ""}`}>
            <p className="ps-title">Payment Successful</p>
            <p className="ps-subtitle">The payment has been recorded successfully.</p>
          </div>

          <div className={`ps-card ${cardVisible ? "visible" : ""}`}>
            <div className="ps-row">
              <span className="ps-label">{customerLabel}</span>
              <span className="ps-value">{customerName}</span>
            </div>
            <div className="ps-row">
              <span className="ps-label">Amount Paid</span>
              <span className="ps-amount">₹{amount}</span>
            </div>
            <div className="ps-row">
              <span className="ps-label">Payment Method</span>
              <span className="ps-value">{method}</span>
            </div>
            <div className="ps-row">
              <span className="ps-label">Payment Date</span>
              <span className="ps-value">{date}</span>
            </div>
          </div>

          <div className={`ps-btn-block ${btnVisible ? "visible" : ""}`}>
            <button className="ps-done-btn" onClick={onDone}>Done</button>
            {onBack && (
              <button className="ps-back-btn" onClick={onBack}>Go Back</button>
            )}
          </div>

        </div>
      </div>
    </>
  );
}