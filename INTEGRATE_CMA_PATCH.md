# CMA Integration Patch for IntegratedChatWidget.tsx

This document contains all the code changes needed to add CMA functionality to the home page chat.

## Changes Summary

1. Add FileText icon import
2. Add state variables for CMA
3. Add CMA handler functions
4. Update ListingCarousel component with selection props
5. Add "Generate CMA" button UI
6. Add CMA results display

---

## 1. Update Imports (Line 23)

**FROM:**
```typescript
import { User, Bot, Loader2, MapPin } from "lucide-react";
```

**TO:**
```typescript
import { User, Bot, Loader2, MapPin, FileText } from "lucide-react";
```

---

## 2. Add State Variables (After Line 169)

**AFTER THIS LINE:**
```typescript
const [hasTrackedFirstMessage, setHasTrackedFirstMessage] = useState(false);
```

**ADD:**
```typescript

  // CMA functionality state
  const [selectedListingsPerMessage, setSelectedListingsPerMessage] = useState<Record<string, Listing[]>>({});
  const [generatingCMA, setGeneratingCMA] = useState(false);
  const [generatedCMAData, setGeneratedCMAData] = useState<Record<string, any>>({});
```

---

## 3. Add CMA Handler Functions (After Line 1284)

**AFTER THIS FUNCTION:**
```typescript
  // Handle "View on Full Map" button click
  const handleViewOnMap = (listings: Listing[]) => {
    const bounds = calculateListingsBounds(listings);

    if (bounds) {
      const boundsParam = encodeURIComponent(JSON.stringify(bounds));
      const mapUrl = `/map?bounds=${boundsParam}`;
      router.push(mapUrl);
    } else {
      router.push("/map");
    }
  };
```

**ADD BEFORE `return (`:**
```typescript

  // Handle property selection changes
  const handleSelectionChange = (messageId: string, selectedListings: Listing[]) => {
    setSelectedListingsPerMessage(prev => ({
      ...prev,
      [messageId]: selectedListings
    }));
  };

  // Handle CMA generation for selected properties
  const handleGenerateCMA = async (messageId: string, selectedListings: Listing[]) => {
    if (selectedListings.length === 0) {
      return;
    }

    try {
      setGeneratingCMA(true);

      // Call the CMA API with selected properties
      const response = await fetch("/api/ai/cma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedProperties: selectedListings.map(l => ({
            address: l.address,
            price: l.price,
            beds: l.beds,
            baths: l.baths,
            sqft: l.sqft,
            city: l.city,
            subdivision: l.subdivision,
            listingId: l.id,
            latitude: l.latitude,
            longitude: l.longitude,
          })),
          city: selectedListings[0]?.city || "Unknown",
          subdivision: selectedListings[0]?.subdivision,
          maxComps: 20,
          includeInvestmentAnalysis: true,
        })
      });

      if (!response.ok) {
        throw new Error(`CMA API failed: ${response.status}`);
      }

      const data = await response.json();

      // Store CMA data by message ID
      setGeneratedCMAData(prev => ({ ...prev, [messageId]: data }));

      // Add CMA result as assistant message
      addMessage({
        role: "assistant",
        content: `📊 I've generated a Comparative Market Analysis for your ${selectedListings.length} selected ${selectedListings.length === 1 ? 'property' : 'properties'}. Here are the insights:`,
        context: "general",
        cmaData: data,
      });

      console.log("Generated CMA:", data);
    } catch (error) {
      console.error("Error generating CMA:", error);
      addMessage({
        role: "assistant",
        content: "I encountered an error while generating the CMA. Please try again.",
        context: "general",
      });
    } finally {
      setGeneratingCMA(false);
    }
  };
```

---

## 4. Update ListingCarousel Component (Line 1690)

**FROM:**
```typescript
<ListingCarousel listings={message.listings} />
```

**TO:**
```typescript
<ListingCarousel
  listings={message.listings}
  onSelectionChange={(selected) => handleSelectionChange(message.id, selected)}
  selectedListings={selectedListingsPerMessage[message.id] || []}
/>
```

---

## 5. Add "Generate CMA" Button (After ListingCarousel, around line 1691)

**AFTER:**
```typescript
                        <ListingCarousel
                          listings={message.listings}
                          onSelectionChange={(selected) => handleSelectionChange(message.id, selected)}
                          selectedListings={selectedListingsPerMessage[message.id] || []}
                        />
                      </motion.div>
```

**ADD:**
```typescript

                      {/* Generate CMA Button */}
                      {selectedListingsPerMessage[message.id]?.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 100,
                            damping: 15,
                            delay: 0.5,
                          }}
                          className="mt-4"
                        >
                          <div className={`flex items-center justify-between border rounded-lg p-4 ${
                            isLight
                              ? 'bg-white/90 border-gray-300'
                              : 'bg-gray-800/50 border-gray-700'
                          }`}>
                            <div>
                              <p className={`text-sm font-semibold ${
                                isLight ? 'text-gray-900' : 'text-gray-200'
                              }`}>
                                {selectedListingsPerMessage[message.id].length} {selectedListingsPerMessage[message.id].length === 1 ? 'property' : 'properties'} selected
                              </p>
                              <p className={`text-xs mt-1 ${
                                isLight ? 'text-gray-600' : 'text-gray-500'
                              }`}>
                                Generate a Comparative Market Analysis for the selected properties
                              </p>
                            </div>
                            <motion.button
                              onClick={() => handleGenerateCMA(message.id, selectedListingsPerMessage[message.id])}
                              disabled={generatingCMA}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FileText className="w-5 h-5" />
                              <span>{generatingCMA ? 'Generating...' : 'Generate CMA'}</span>
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
```

---

## 6. Add CMA Results Display (After the "Generate CMA" button)

**ADD:**
```typescript

                      {/* CMA Results Display */}
                      {(message as any).cmaData && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 100,
                            damping: 15,
                            delay: 0.6,
                          }}
                          className="mt-6"
                        >
                          <div className={`rounded-lg border p-6 ${
                            isLight
                              ? 'bg-white/90 border-gray-300'
                              : 'bg-gray-800 border-gray-700'
                          }`}>
                            {/* CMA Header */}
                            <div className="mb-4">
                              <h3 className={`text-lg font-bold mb-2 ${
                                isLight ? 'text-blue-600' : 'text-emerald-400'
                              }`}>
                                📊 Comparative Market Analysis
                              </h3>
                              <p className={`text-sm ${
                                isLight ? 'text-gray-700' : 'text-gray-300'
                              }`}>
                                I've analyzed {(message as any).cmaData.selectedProperties?.length || 0} selected {(message as any).cmaData.selectedProperties?.length === 1 ? 'property' : 'properties'} and found {(message as any).cmaData.comparables?.length || 0} comparable properties within a 1-mile radius.
                              </p>
                            </div>

                            {/* Market Statistics Grid */}
                            <div className={`rounded-lg p-4 mb-4 ${
                              isLight ? 'bg-gray-100' : 'bg-gray-900/50'
                            }`}>
                              <h4 className={`text-sm font-semibold mb-3 ${
                                isLight ? 'text-gray-700' : 'text-gray-300'
                              }`}>Market Statistics</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
                                    Median Price/SqFt
                                  </p>
                                  <p className={`text-lg font-bold ${isLight ? 'text-blue-600' : 'text-emerald-400'}`}>
                                    ${(message as any).cmaData.cmaMetrics?.medianPricePerSqft?.toFixed(2) || '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
                                    Avg Days on Market
                                  </p>
                                  <p className={`text-lg font-bold ${isLight ? 'text-blue-600' : 'text-emerald-400'}`}>
                                    {Math.round((message as any).cmaData.cmaMetrics?.averageDaysOnMarket || 0)} days
                                  </p>
                                </div>
                                <div>
                                  <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
                                    Price Range
                                  </p>
                                  <p className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-gray-300'}`}>
                                    ${((message as any).cmaData.cmaMetrics?.priceRange?.min || 0).toLocaleString()} - ${((message as any).cmaData.cmaMetrics?.priceRange?.max || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>
                                    Active/Closed
                                  </p>
                                  <p className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-gray-300'}`}>
                                    {(message as any).cmaData.cmaMetrics?.activeCount || 0} / {(message as any).cmaData.cmaMetrics?.closedCount || 0}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Comparable Properties Table */}
                            <div className={`rounded-lg p-4 ${
                              isLight ? 'bg-gray-100' : 'bg-gray-900/50'
                            }`}>
                              <h4 className={`text-sm font-semibold mb-3 ${
                                isLight ? 'text-gray-700' : 'text-gray-300'
                              }`}>
                                Comparable Properties ({(message as any).cmaData.comparables?.length || 0})
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className={`border-b ${isLight ? 'border-gray-300' : 'border-gray-700'}`}>
                                      <th className={`text-left py-2 px-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Address</th>
                                      <th className={`text-right py-2 px-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Status</th>
                                      <th className={`text-right py-2 px-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Price</th>
                                      <th className={`text-right py-2 px-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Beds</th>
                                      <th className={`text-right py-2 px-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Baths</th>
                                      <th className={`text-right py-2 px-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>SqFt</th>
                                      <th className={`text-right py-2 px-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>$/SqFt</th>
                                      <th className={`text-right py-2 px-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>DOM</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(message as any).cmaData.comparables?.slice(0, 10).map((comp: any, idx: number) => (
                                      <tr key={idx} className={`border-b ${isLight ? 'border-gray-200 hover:bg-gray-200' : 'border-gray-800 hover:bg-gray-800/50'}`}>
                                        <td className={`py-2 px-2 truncate max-w-[200px] ${isLight ? 'text-gray-900' : 'text-gray-300'}`} title={comp.address}>
                                          {comp.address}
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                          <span className={`text-xs px-2 py-0.5 rounded ${
                                            comp.status === 'Active'
                                              ? 'bg-green-900/30 text-green-400'
                                              : 'bg-gray-700 text-gray-400'
                                          }`}>
                                            {comp.status}
                                          </span>
                                        </td>
                                        <td className={`py-2 px-2 text-right ${isLight ? 'text-gray-900' : 'text-gray-300'}`}>
                                          ${(comp.finalPrice || 0).toLocaleString()}
                                        </td>
                                        <td className={`py-2 px-2 text-right ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>{comp.beds}</td>
                                        <td className={`py-2 px-2 text-right ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>{comp.baths}</td>
                                        <td className={`py-2 px-2 text-right ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>{(comp.sqft || 0).toLocaleString()}</td>
                                        <td className={`py-2 px-2 text-right font-semibold ${isLight ? 'text-blue-600' : 'text-emerald-400'}`}>
                                          ${comp.pricePerSqft?.toFixed(0) || '—'}
                                        </td>
                                        <td className={`py-2 px-2 text-right ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>{comp.daysOnMarket || '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
```

---

## Application Instructions

1. Open `src/app/components/chatwidget/IntegratedChatWidget.tsx`
2. Apply each change in order (1-6)
3. Save the file
4. The dev server should hot-reload automatically
5. Test on home page by:
   - Asking "Show me homes in Palm Desert Country Club"
   - Selecting properties with checkboxes
   - Clicking "Generate CMA" button
   - Viewing CMA results

---

## Testing Checklist

- [ ] FileText icon imports without error
- [ ] No TypeScript errors in file
- [ ] Chat still works normally
- [ ] Listings display with checkboxes
- [ ] "Generate CMA" button appears when properties selected
- [ ] CMA API call succeeds
- [ ] CMA results display properly
- [ ] Works in both light and dark themes
- [ ] Multiple searches can have independent selections

---

## Notes

- All API endpoints already exist and work ✅
- No backend changes needed ✅
- Uses same pattern as test page ✅
- Message-based state prevents selection conflicts ✅
- Theme-aware UI matches existing design ✅
