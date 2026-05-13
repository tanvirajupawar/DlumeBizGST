import React from "react";

const SubscriptionPage = () => {
  const activePlan = "3 Months";
  const daysLeft = 176;

  const plans = [
    { name: "1 Month", price: 749, discount: null },
    { name: "3 Months", price: 2138, discount: "5% OFF" },
    { name: "12 Months", price: 8100, discount: "10% OFF" },
  ];

  return (
    <div className="p-6">

      {/* 🔹 Current Plan Info */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800">
          Your Subscription
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Active Plan:{" "}
          <span className="font-medium text-indigo-600">
            {activePlan}
          </span>
        </p>
        <p className="text-xs text-gray-400">
          {daysLeft} days remaining
        </p>
      </div>

      {/* 🔹 Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {plans.map((plan, i) => {
          const isActive = plan.name === activePlan;

          return (
            <div
              key={i}
              className={`bg-white border rounded-xl p-6 shadow-sm relative transition ${
                isActive
                  ? "border-indigo-600 ring-2 ring-indigo-100"
                  : "border-gray-200 hover:shadow-md"
              }`}
            >

              {/* Discount */}
              {plan.discount && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs px-3 py-1 rounded-bl-lg">
                  {plan.discount}
                </div>
              )}

              {/* Plan */}
              <h3 className="text-lg font-semibold text-gray-800">
                {plan.name}
              </h3>

              {/* Price */}
              <p className="text-2xl font-bold text-gray-900 mt-2">
                ₹{plan.price}
              </p>

              <p className="text-xs text-gray-400 mt-1">
                + 18% GST
              </p>

              {/* Active */}
              {isActive && (
                <div className="mt-2 text-indigo-600 text-xs font-medium">
                  ✔ Current Plan
                </div>
              )}

              {/* Button */}
              <button
                disabled={isActive}
                className={`w-full mt-5 py-2 rounded-md font-medium transition ${
                  isActive
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-[#1e3a8a] text-white hover:bg-[#172f6b]"
                }`}
              >
                {isActive ? "Current Plan" : "Upgrade Plan"}
              </button>

              {/* Features */}
              <ul className="mt-5 space-y-2 text-sm text-gray-600">
                <li>✔ GST-ready reports</li>
                <li>✔ WhatsApp invoice sharing</li>
                <li>✔ Inventory management</li>
                <li>✔ Customer tracking</li>
              </ul>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default SubscriptionPage;