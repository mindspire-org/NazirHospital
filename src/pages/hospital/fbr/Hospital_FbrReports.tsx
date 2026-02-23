import { useEffect, useMemo, useState } from "react";
import { hospitalApi } from "../../../utils/api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Hospital_Modal from "../../../components/hospital/bed-management/Hospital_Modal";

type Row = {
  _id: string;
  createdAt?: string;
  invoiceType?: string;
  module?: string;
  amount?: number;
  fbrInvoiceNo?: string;
  status?: string;
  fbrMode?: string;
  refId?: string;
  payload?: any;
};

export default function Hospital_FbrReports() {
  const cols = [
    "Date",
    "Module",
    "Invoice No",
    "Amount",
    "FBR No",
    "Status",
    "Mode",
  ];
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [status, setStatus] = useState("");
  // Removed environment filter as per user request
  const [kpis, setKpis] = useState({
    invoices: 0,
    amount: 0,
    success: 0,
    failed: 0,
  });
  const [rows, setRows] = useState<Row[]>([]);

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const params = useMemo(
    () => ({
      from,
      to,
      module: moduleFilter || undefined,
      status: status || undefined,
    }),
    [from, to, moduleFilter, status],
  );

  async function refresh() {
    const s: any = await hospitalApi.summaryFbr(params as any);
    setKpis(s?.totals || { invoices: 0, amount: 0, success: 0, failed: 0 });
    const list: any = await hospitalApi.listFbrLogs({
      ...(params as any),
      limit: 100,
      page: 1,
    });
    setRows(Array.isArray(list?.items) ? list.items : []);
  }

  useEffect(() => {
    refresh();
  }, []);

  function deriveInvoiceNo(row: Row) {
    const p = row?.payload || {};
    return p.billNo || p.tokenNo || p.admissionNo || row.refId || "—";
  }

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("FBR Reports Summary", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Range: ${from || "Start"} to ${to || "End"}`, 14, 37);

      autoTable(doc, {
        startY: 45,
        head: [
          [
            "Date",
            "Module",
            "Invoice No",
            "Amount",
            "FBR No",
            "Status",
            "Mode",
          ],
        ],
        body: rows.map((r) => [
          r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
          r.invoiceType || r.module || "",
          String(deriveInvoiceNo(r)),
          (r.amount || 0).toFixed(2),
          r.fbrInvoiceNo || "",
          r.status || "",
          r.fbrMode || "",
        ]),
        theme: "striped",
        headStyles: { fillColor: 200, textColor: 50 },
      });

      doc.save(`fbr-report-${Date.now()}.pdf`);
    } catch (e) {
      console.error("PDF Export Failed:", e);
      setErrorMsg(
        "Failed to generate PDF. Please check the console for details.",
      );
      setErrorOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">FBR Reports</h2>
          <div className="mt-1 text-sm text-slate-500">
            Run summaries by date range, module, status, and environment.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => {
              const csv = [
                [
                  "Date",
                  "Module",
                  "Invoice No",
                  "Amount",
                  "FBR No",
                  "Status",
                  "Mode",
                ].join(","),
                ...rows.map((r) =>
                  [
                    r.createdAt ? new Date(r.createdAt).toISOString() : "",
                    r.invoiceType || r.module || "",
                    String(deriveInvoiceNo(r)),
                    String(r.amount || ""),
                    r.fbrInvoiceNo || "",
                    r.status || "",
                    r.fbrMode || "",
                  ]
                    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                    .join(","),
                ),
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `fbr-report-${Date.now()}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </button>
          <button
            className="rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white hover:bg-violet-800"
            onClick={exportToPDF}
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          >
            <option value="">All Modules</option>
            <option value="OPD">OPD</option>
            <option value="PHARMACY">PHARMACY</option>
            <option value="LAB">LAB</option>
            <option value="IPD">IPD</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          >
            <option value="">All Status</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
          </select>
          <button
            className="rounded-md bg-violet-700 px-3 py-2 text-sm font-medium text-white hover:bg-violet-800"
            onClick={refresh}
          >
            Run
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Invoices" value={String(kpis.invoices)} />
        <Card title="Amount" value={kpis.amount.toFixed(2)} />
        <Card title="Success" value={String(kpis.success)} />
        <Card title="Failed" value={String(kpis.failed)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="overflow-auto">
          <table className="min-w-[1000px] w-full border-collapse text-sm">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th
                    key={c}
                    className="border-b border-slate-200 px-3 py-2 text-left text-slate-600"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={cols.length}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    No data
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    {r.invoiceType || r.module || "—"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    {deriveInvoiceNo(r)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    {r.amount != null ? Number(r.amount).toFixed(2) : "—"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    {r.fbrInvoiceNo || "—"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    {r.status || "—"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    {r.fbrMode || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Hospital_Modal open={errorOpen} onClose={() => setErrorOpen(false)}>
        <div className="space-y-4">
          <div className="text-lg font-semibold">Error</div>
          <div className="text-sm text-slate-700 dark:text-slate-200">
            {errorMsg}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setErrorOpen(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      </Hospital_Modal>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}
