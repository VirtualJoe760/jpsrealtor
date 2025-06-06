// src/app/components/mls/map/MortgageCalculator.tsx

"use client";

import { useState, useEffect } from "react";

type MortgageCalculatorProps = {
  price?: number;
  downPayment?: number;
  interestRate?: number; // Annual interest rate in %
  loanTerm?: number; // In years
};

export default function MortgageCalculator({
  price = 500000,
  downPayment = 100000,
  interestRate = 6.5,
  loanTerm = 30,
}: MortgageCalculatorProps) {
  const [priceState, setPriceState] = useState(price);
  const [downPaymentState, setDownPaymentState] = useState(downPayment);
  const [interestRateState, setInterestRateState] = useState(interestRate);
  const [loanTermState, setLoanTermState] = useState(loanTerm);

  useEffect(() => {
    setPriceState(price);
  }, [price]);

  const loanAmount = priceState - downPaymentState;
  const monthlyRate = interestRateState / 100 / 12;
  const numberOfPayments = loanTermState * 12;

  const monthlyPayment =
    loanAmount > 0
      ? (loanAmount * monthlyRate) /
        (1 - Math.pow(1 + monthlyRate, -numberOfPayments))
      : 0;

  return (
    <div className="p-4 bg-zinc-900 rounded-lg shadow-md text-white mt-6">
      <h2 className="text-lg font-semibold mb-4 pb-10">Mortgage Calculator</h2>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col">
          Price
          <input
            type="number"
            value={priceState}
            onChange={(e) => setPriceState(parseFloat(e.target.value))}
            className="mt-1 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-white"
          />
        </label>

        <label className="flex flex-col">
          Down Payment
          <input
            type="number"
            value={downPaymentState}
            onChange={(e) => setDownPaymentState(parseFloat(e.target.value))}
            className="mt-1 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-white"
          />
        </label>

        <label className="flex flex-col">
          Interest Rate (%)
          <input
            type="number"
            step="0.01"
            value={interestRateState}
            onChange={(e) =>
              setInterestRateState(parseFloat(e.target.value))
            }
            className="mt-1 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-white"
          />
        </label>

        <label className="flex flex-col">
          Loan Term (years)
          <input
            type="number"
            value={loanTermState}
            onChange={(e) => setLoanTermState(parseInt(e.target.value))}
            className="mt-1 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-white"
          />
        </label>
      </div>

      <div className="mt-4 text-emerald-400 font-bold">
        Estimated Monthly Payment: ${monthlyPayment.toFixed(2)}
      </div>
    </div>
  );
}
