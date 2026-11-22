// src/app/components/mls/map/MortgageCalculator.tsx

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Percent, Calendar, TrendingDown, Info, RefreshCw, Loader2 } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

type MortgageCalculatorProps = {
  price?: number;
  downPayment?: number;
  interestRate?: number; // Annual interest rate in %
  loanTerm?: number; // In years
  annualPropertyTaxRate?: number;
  annualCondoInsurance?: number;
  monthlyHoa?: number;
};

export function getListingMortgageCosts(listing: {
  stateOrProvince?: string;
  propertySubType?: string;
  associationFee?: number;
  associationFeeFrequency?: string;
  hoaFee?: number;
  hoaFeeFrequency?: string;
}) {
  const california = /^(CA|California)$/i.test(listing.stateOrProvince?.trim() || "");
  const condo = /^condominium$/i.test(listing.propertySubType?.trim() || "");
  const fee = listing.associationFee ?? listing.hoaFee;
  const frequency = (listing.associationFeeFrequency || listing.hoaFeeFrequency || "").trim().toLowerCase();
  const monthsPerBill: Record<string, number> = { monthly: 1, quarterly: 3, "semi-annually": 6, semiannual: 6, annually: 12, annual: 12, yearly: 12 };
  const months = monthsPerBill[frequency];
  return {
    annualPropertyTaxRate: california ? 0.0125 : undefined,
    annualCondoInsurance: california && condo ? 722 : undefined,
    monthlyHoa: typeof fee === "number" && Number.isFinite(fee) && fee >= 0 && months ? fee / months : undefined,
  };
}

interface MortgageRateData {
  frm_30?: number;
  frm_15?: number;
  date?: string;
}

export default function MortgageCalculator({
  price = 500000,
  downPayment = 100000,
  interestRate = 6.5,
  loanTerm = 30,
  annualPropertyTaxRate,
  annualCondoInsurance,
  monthlyHoa,
}: MortgageCalculatorProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [priceState, setPriceState] = useState(price);
  const [downPaymentState, setDownPaymentState] = useState(downPayment);
  const [interestRateState, setInterestRateState] = useState(interestRate);
  const [loanTermState, setLoanTermState] = useState(loanTerm);
  const [mortgageRates, setMortgageRates] = useState<MortgageRateData | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(true);
  const [isFallbackRate, setIsFallbackRate] = useState(false);
  const [taxInput, setTaxInput] = useState<string>();
  const [insuranceInput, setInsuranceInput] = useState<string>();
  const [mortgageInsuranceInput, setMortgageInsuranceInput] = useState("");
  const [hoaInput, setHoaInput] = useState<string>();

  useEffect(() => {
    setPriceState(price);
  }, [price]);

  // Fetch current mortgage rates
  const fetchMortgageRates = async () => {
    setIsLoadingRates(true);
    try {
      const response = await fetch("/api/mortgage-rates");
      if (!response.ok) {
        setMortgageRates(null);
        setIsFallbackRate(true);
        return;
      }
      const result = await response.json();

      if (result.success) {
        setMortgageRates(result.data);
        setIsFallbackRate(result.fallback || false);

        // Auto-set rate based on loan term
        if (result.data) {
          if (loanTermState === 30 && result.data.frm_30) {
            setInterestRateState(result.data.frm_30);
          } else if (loanTermState === 15 && result.data.frm_15) {
            setInterestRateState(result.data.frm_15);
          }
        }
      } else {
        setMortgageRates(result.data);
        setIsFallbackRate(true);
      }
    } catch (error) {
      console.warn("Failed to fetch mortgage rates:", error);
      setMortgageRates(null);
      setIsFallbackRate(true);
    } finally {
      setIsLoadingRates(false);
    }
  };

  useEffect(() => {
    fetchMortgageRates();
  }, []);

  // Auto-update interest rate when loan term changes
  useEffect(() => {
    if (mortgageRates) {
      if (loanTermState === 30 && mortgageRates.frm_30) {
        setInterestRateState(mortgageRates.frm_30);
      } else if (loanTermState === 15 && mortgageRates.frm_15) {
        setInterestRateState(mortgageRates.frm_15);
      }
    }
  }, [loanTermState, mortgageRates]);

  const loanAmount = Math.max(0, priceState - downPaymentState);
  const monthlyRate = interestRateState / 100 / 12;
  const numberOfPayments = loanTermState * 12;

  const monthlyPayment =
    monthlyRate > 0
      ? (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numberOfPayments))
      : loanAmount / numberOfPayments;

  const tax = taxInput ?? (annualPropertyTaxRate ? String(Math.round(priceState * annualPropertyTaxRate / 12)) : "");
  const insurance = insuranceInput ?? (annualCondoInsurance ? (annualCondoInsurance / 12).toFixed(2) : "");
  const hoa = hoaInput ?? (monthlyHoa != null ? monthlyHoa.toFixed(2) : "");
  const costInputs = [
    { label: "Property tax", value: tax, update: setTaxInput },
    { label: "Homeowners insurance", value: insurance, update: setInsuranceInput },
    { label: "Mortgage insurance", value: mortgageInsuranceInput, update: setMortgageInsuranceInput },
    { label: "HOA dues", value: hoa, update: setHoaInput },
  ];
  const ownershipPayment = monthlyPayment + costInputs.reduce((sum, cost) => sum + Number(cost.value), 0);
  const pmiMayApply = loanAmount > 0 && downPaymentState < priceState * 0.2 && Number(mortgageInsuranceInput) === 0;
  const formatPayment = (amount: number) => amount.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const totalPayment = monthlyPayment * numberOfPayments;
  const totalInterest = totalPayment - loanAmount;
  const downPaymentPercent = ((downPaymentState / priceState) * 100).toFixed(1);

  const useTodaysRate = (term: 15 | 30) => {
    if (term === 30 && mortgageRates?.frm_30) {
      setInterestRateState(mortgageRates.frm_30);
      setLoanTermState(30);
    } else if (term === 15 && mortgageRates?.frm_15) {
      setInterestRateState(mortgageRates.frm_15);
      setLoanTermState(15);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Rates Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border p-4 ${
          isLight
            ? 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20'
            : 'bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/20'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingDown className={`w-4 h-4 ${isLight ? 'text-blue-500' : 'text-emerald-400'}`} />
            <h4 className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>National Mortgage Rates</h4>
          </div>
          <button
            onClick={fetchMortgageRates}
            disabled={isLoadingRates}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
              isLight ? 'hover:bg-gray-200' : 'hover:bg-white/10'
            }`}
            title="Refresh rates"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLight ? 'text-blue-500' : 'text-emerald-400'} ${isLoadingRates ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoadingRates ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className={`w-5 h-5 animate-spin ${isLight ? 'text-blue-500' : 'text-emerald-400'}`} />
          </div>
        ) : mortgageRates ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => useTodaysRate(30)}
              className={`relative overflow-hidden rounded-lg p-3 transition-all border ${
                loanTermState === 30 && mortgageRates?.frm_30 === interestRateState
                  ? isLight
                    ? 'bg-blue-500/20 border-blue-500/50 ring-1 ring-blue-500/50'
                    : 'bg-emerald-500/20 border-emerald-500/50 ring-1 ring-emerald-500/50'
                  : isLight
                    ? 'bg-gray-100 border-gray-300 hover:border-blue-500/30'
                    : 'bg-neutral-900/50 border-neutral-700/30 hover:border-emerald-500/30'
              }`}
            >
              <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>30-Year Fixed</div>
              <div className={`text-xl font-bold ${isLight ? 'text-blue-600' : 'text-emerald-400'}`}>
                {mortgageRates?.frm_30?.toFixed(2)}%
              </div>
            </button>

            <button
              onClick={() => useTodaysRate(15)}
              className={`relative overflow-hidden rounded-lg p-3 transition-all border ${
                loanTermState === 15 && mortgageRates?.frm_15 === interestRateState
                  ? 'bg-cyan-500/20 border-cyan-500/50 ring-1 ring-cyan-500/50'
                  : isLight
                    ? 'bg-gray-100 border-gray-300 hover:border-cyan-500/30'
                    : 'bg-neutral-900/50 border-neutral-700/30 hover:border-cyan-500/30'
              }`}
            >
              <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>15-Year Fixed</div>
              <div className="text-xl font-bold text-cyan-500">
                {mortgageRates?.frm_15?.toFixed(2)}%
              </div>
            </button>
          </div>
        ) : null}

        {!isLoadingRates && (
          <div className={`mt-3 text-xs flex items-center gap-1.5 ${isLight ? 'text-gray-500' : 'text-neutral-500'}`}>
            <Info className="w-3 h-3" />
            {!mortgageRates ? (
              <span>Rate feed unavailable. Enter a rate below to update the estimate.</span>
            ) : isFallbackRate ? (
              <span>Showing estimated rates</span>
            ) : (
              <span>Weekly U.S. averages</span>
            )}
          </div>
        )}
      </motion.div>

      {/* Calculator Inputs */}
      <div className="space-y-3">
        {/* Home Price */}
        <div className="space-y-2">
          <label className={`flex items-center gap-2 text-sm font-medium ${isLight ? 'text-gray-700' : 'text-neutral-300'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? 'bg-blue-500/10' : 'bg-emerald-500/10'}`}>
              <DollarSign className={`w-4 h-4 ${isLight ? 'text-blue-500' : 'text-emerald-400'}`} />
            </div>
            Home Price
          </label>
          <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLight ? 'text-gray-500' : 'text-neutral-500'}`}>$</span>
            <input
              type="number"
              value={priceState}
              onChange={(e) => setPriceState(parseFloat(e.target.value) || 0)}
              className={`w-full pl-8 pr-4 py-3 rounded-xl border transition-all outline-none ${
                isLight
                  ? 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-neutral-900/50 border-neutral-700/30 text-white focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
          </div>
        </div>

        {/* Down Payment */}
        <div className="space-y-2">
          <label className={`flex items-center justify-between text-sm font-medium ${isLight ? 'text-gray-700' : 'text-neutral-300'}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-cyan-500" />
              </div>
              Down Payment
            </div>
            <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-neutral-500'}`}>{downPaymentPercent}%</span>
          </label>
          <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLight ? 'text-gray-500' : 'text-neutral-500'}`}>$</span>
            <input
              type="number"
              value={downPaymentState}
              onChange={(e) => setDownPaymentState(parseFloat(e.target.value) || 0)}
              className={`w-full pl-8 pr-4 py-3 rounded-xl border transition-all outline-none ${
                isLight
                  ? 'bg-white border-gray-300 text-gray-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                  : 'bg-neutral-900/50 border-neutral-700/30 text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20'
              }`}
            />
          </div>
        </div>

        {/* Interest Rate */}
        <div className="space-y-2">
          <label className={`flex items-center gap-2 text-sm font-medium ${isLight ? 'text-gray-700' : 'text-neutral-300'}`}>
            <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Percent className="w-4 h-4 text-purple-500" />
            </div>
            Interest Rate
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              value={interestRateState}
              onChange={(e) => setInterestRateState(parseFloat(e.target.value) || 0)}
              className={`w-full pl-4 pr-10 py-3 rounded-xl border transition-all outline-none ${
                isLight
                  ? 'bg-white border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                  : 'bg-neutral-900/50 border-neutral-700/30 text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
              }`}
            />
            <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${isLight ? 'text-gray-500' : 'text-neutral-500'}`}>%</span>
          </div>
        </div>

        {/* Loan Term */}
        <div className="space-y-2">
          <label className={`flex items-center gap-2 text-sm font-medium ${isLight ? 'text-gray-700' : 'text-neutral-300'}`}>
            <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-orange-500" />
            </div>
            Loan Term
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLoanTermState(30)}
              className={`py-3 px-4 rounded-xl font-medium transition-all ${
                loanTermState === 30
                  ? 'bg-orange-500/20 border-2 border-orange-500/50 text-orange-500'
                  : isLight
                    ? 'bg-gray-100 border border-gray-300 text-gray-600 hover:border-orange-500/30'
                    : 'bg-neutral-900/50 border border-neutral-700/30 text-neutral-400 hover:border-orange-500/30'
              }`}
            >
              30 Years
            </button>
            <button
              onClick={() => setLoanTermState(15)}
              className={`py-3 px-4 rounded-xl font-medium transition-all ${
                loanTermState === 15
                  ? 'bg-orange-500/20 border-2 border-orange-500/50 text-orange-500'
                  : isLight
                    ? 'bg-gray-100 border border-gray-300 text-gray-600 hover:border-orange-500/30'
                    : 'bg-neutral-900/50 border border-neutral-700/30 text-neutral-400 hover:border-orange-500/30'
              }`}
            >
              15 Years
            </button>
          </div>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">Monthly taxes, insurance and dues</legend>
        <div className="grid grid-cols-2 gap-3">
          {costInputs.map((cost) => (
            <label key={cost.label} className="space-y-1 text-xs">
              <span className="block">{cost.label}</span>
              <input type="number" inputMode="decimal" min={0} step="0.01" placeholder="Enter amount"
                className={`w-full rounded-lg border px-2 py-2 ${isLight ? "border-gray-300 bg-white" : "border-neutral-700 bg-neutral-900"}`}
                value={cost.value} onChange={(event) => cost.update(event.target.valueAsNumber < 0 ? "0" : event.target.value)} />
            </label>
          ))}
        </div>
        {annualPropertyTaxRate && taxInput == null && <p className="text-xs opacity-75">Property tax estimate uses 1.25% of the purchase price per year.</p>}
        {annualCondoInsurance && insuranceInput == null && <p className="text-xs opacity-75">Insurance estimate uses the California condo average of $722 per year (NAIC, 2023 data).</p>}
        {pmiMayApply && <p className="text-xs font-medium">Mortgage insurance may apply. Enter the monthly amount from your lender.</p>}
      </fieldset>

      {/* Results */}
      <motion.div
        layout
        className={`rounded-xl border p-5 space-y-4 ${
          isLight
            ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30'
            : 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-emerald-500/30'
        }`}
      >
        <div>
          <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Estimated Monthly Housing Cost</div>
          <motion.div
            key={ownershipPayment}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-4xl font-extrabold text-transparent bg-clip-text ${
              isLight
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                : 'bg-gradient-to-r from-emerald-400 to-cyan-400'
            }`}
          >
            {formatPayment(ownershipPayment)}
          </motion.div>
          <dl className="mt-3 space-y-1 text-sm">
            {[{ label: "Principal & Interest", value: monthlyPayment }, ...costInputs.map((cost) => ({
              label: cost.label, value: cost.value === "" ? null : Number(cost.value),
            }))].map((line) => (
              <div key={line.label} className="flex justify-between gap-2">
                <dt>{line.label}</dt><dd>{line.value == null ? "—" : formatPayment(line.value)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={`grid grid-cols-2 gap-4 pt-4 border-t ${isLight ? 'border-gray-300/50' : 'border-neutral-700/30'}`}>
          <div>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Loan Amount</div>
            <div className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              ${loanAmount.toLocaleString()}
            </div>
          </div>
          <div>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Total Interest</div>
            <div className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              ${totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <div className={`pt-4 border-t ${isLight ? 'border-gray-300/50' : 'border-neutral-700/30'}`}>
          <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Principal & Interest Over {loanTermState} Years</div>
          <div className={`text-xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            ${totalPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </motion.div>

      {/* Disclaimer */}
      <div className={`text-xs flex items-start gap-2 rounded-lg p-3 border ${
        isLight
          ? 'text-gray-600 bg-gray-100 border-gray-200'
          : 'text-neutral-500 bg-neutral-900/30 border-neutral-800/30'
      }`}>
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Estimates include the costs shown above. Blank amounts are excluded. Actual taxes, insurance and dues can vary. Closing costs, utilities and maintenance are separate.
        </span>
      </div>
    </div>
  );
}
