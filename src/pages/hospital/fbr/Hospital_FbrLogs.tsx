import { useEffect, useMemo, useState } from "react";
import { hospitalApi } from "../../../utils/api";
import Hospital_Modal from "../../../components/hospital/bed-management/Hospital_Modal";

type LogItem = {
  _id: string;
  createdAt?: string;
  module?: string;
  invoiceType?: "OPD" | "PHARMACY" | "LAB" | "IPD";
  amount?: number;
  fbrInvoiceNo?: string;
  status?: "SUCCESS" | "FAILED";
  fbrMode?: "MOCK" | "SANDBOX" | "PRODUCTION";
  refId?: string;
  payload?: any;
};

export default function Hospital_FbrLogs() {
  const cols = [
    "Date",
    "Invoice No",
    "Module",
    "Amount",
    "FBR No",
    "Status",
    "Mode",
  ];
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerBody, setViewerBody] = useState("");

  const params = useMemo(
    () => ({
      q,
      from,
      to,
      module: moduleFilter || undefined,
      status: status || undefined,
      page,
      limit: pageSize,
    }),
    [q, from, to, moduleFilter, status, page],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res: any = await hospitalApi.listFbrLogs(params as any);
      if (cancelled) return;
      setItems(Array.isArray(res?.items) ? res.items : []);
      setTotal(Number(res?.total || 0));
    })();
    return () => {
      cancelled = true;
    };
  }, [
    params.q,
    params.from,
    params.to,
    params.module,
    params.status,
    params.page,
  ]);

  function deriveInvoiceNo(row: LogItem) {
    const p = row?.payload || {};
    return p.billNo || p.tokenNo || p.admissionNo || row.refId || "—";
  }

  async function handleRetry(id: string) {
    try {
      await hospitalApi.retryFbrLog(id);
      // refresh
      const res: any = await hospitalApi.listFbrLogs(params as any);
      setItems(Array.isArray(res?.items) ? res.items : []);
      setTotal(Number(res?.total || 0));
    } catch {}
  }

  function openViewer(title: string, payload: any) {
    setViewerTitle(title);
    try {
      setViewerBody(JSON.stringify(payload, null, 2));
    } catch {
      setViewerBody(String(payload ?? ""));
    }
    setViewerOpen(true);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">FBR Logs</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <input
            placeholder="Search..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
          <select
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">All Modules</option>
            <option value="OPD">OPD</option>
            <option value="PHARMACY">PHARMACY</option>
            <option value="LAB">LAB</option>
            <option value="IPD">IPD</option>
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
        <div className="overflow-auto">
          <table className="min-w-[800px] w-full border-collapse text-sm">
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
                <th className="border-b border-slate-200 px-3 py-2 text-left text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={cols.length + 1}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    No logs
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <tr key={row._id} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    {deriveInvoiceNo(row)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    {row.invoiceType || row.module || "—"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    {row.amount != null ? Number(row.amount).toFixed(2) : "—"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    {row.fbrInvoiceNo || "—"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    {row.status || "—"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    {row.fbrMode || "—"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                    <div className="flex gap-2">
                      <button
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        onClick={() => openViewer("Log", row)}
                      >
                        View
                      </button>
                      <button
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        onClick={() => openViewer("Payload", row.payload || {})}
                      >
                        Payload
                      </button>
                      <button
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        disabled={row.status !== "FAILED"}
                        onClick={() => handleRetry(row._id)}
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <div>
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border border-slate-300 px-2 py-1"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              className="rounded-md border border-slate-300 px-2 py-1"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Hospital_Modal open={viewerOpen} onClose={() => setViewerOpen(false)}>
        <div className="space-y-3">
          <div className="text-lg font-semibold">{viewerTitle}</div>
          <pre className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            {viewerBody}
          </pre>
          <div className="flex justify-end">
            <button
              onClick={() => setViewerOpen(false)}
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
