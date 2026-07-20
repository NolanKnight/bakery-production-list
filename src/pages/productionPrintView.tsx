import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

import { Input } from "@/components/ui/input";

export default function ProductionPrintPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const data = useQuery(api.production.getDailyProduction, {
    date,
  });

  if (!data) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 print:p-0">
      {/* Controls (hidden when printing) */}
      <div className="mb-6 print:hidden flex items-center gap-4">
        <h1 className="text-xl font-bold">Production Print Sheet</h1>

        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-48"
        />

        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded bg-black text-white"
        >
          Print
        </button>
      </div>

      {/* HEADER */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Daily Production Sheet</h2>
        <p className="text-sm text-muted-foreground">Date: {date}</p>
      </div>

      {/* TABLE */}
      <div className="space-y-8">
        {data.map((category) => (
          <div key={category.category}>
            <h3 className="text-lg font-semibold border-b pb-1 mb-3">
              {category.category}
            </h3>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Item</th>
                  <th>Par</th>
                  <th>Wholesale</th>
                  <th>Total</th>
                  <th className="w-24">Baked</th>
                  <th className="w-24">Notes</th>
                </tr>
              </thead>

              <tbody>
                {category.items.map((item) => (
                  <tr key={item.itemId} className="border-b">
                    <td className="py-2">{item.name}</td>

                    <td>{item.par}</td>

                    <td>{item.wholesale}</td>

                    <td className="font-semibold">{item.finalTotal}</td>

                    {/* Blank fields for bakers */}
                    <td className="border-l px-2"> </td>

                    <td className="border-l px-2"> </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
          }

          table {
            font-size: 12px;
          }

          th, td {
            padding: 4px;
          }
        }
      `}</style>
    </div>
  );
}
