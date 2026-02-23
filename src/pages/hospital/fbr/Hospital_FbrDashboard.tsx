import { useEffect, useState } from "react";
import { hospitalApi } from "../../../utils/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Hospital_Modal from "../../../components/hospital/bed-management/Hospital_Modal";

type ModuleStats = { OPD: number; PHARMACY: number; LAB: number; IPD: number };
type DailyData = {
  date: string;
  count: number;
  amount: number;
  success: number;
  failed: number;
};

export default function Hospital_FbrDashboard() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [env, setEnv] = useState<"sandbox" | "production">("sandbox");
  const [invoicesToday, setInvoicesToday] = useState(0);
  const [invoicesMonth, setInvoicesMonth] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [moduleStats, setModuleStats] = useState<ModuleStats>({
    OPD: 0,
    PHARMACY: 0,
    LAB: 0,
    IPD: 0,
  });
  const [yesterdayPct, setYesterdayPct] = useState(0);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function persistEnabled(nextVal: boolean) {
    try {
      const current: any = await hospitalApi.getFbrSettings();
      await hospitalApi.updateFbrSettings({
        isEnabled: nextVal,
        environment: current?.environment || env,
        ntn: current?.ntn || "",
        strn: current?.strn || "",
        posId: current?.posId || "",
        sandboxPosId: current?.sandboxPosId || "",
        sandboxCode: current?.sandboxCode || "",
        productionPosId: current?.productionPosId || "",
        productionCode: current?.productionCode || "",
        businessName: current?.businessName || "",
        branchCode: current?.branchCode || "",
        invoicePrefix: current?.invoicePrefix || "HSP",
        applyModules: Array.isArray(current?.applyModules) ? current.applyModules : undefined,
      } as any);
      setEnabled(nextVal);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || "Failed to update FBR status");
      setErrorOpen(true);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await hospitalApi.getFbrSettings();
        if (!mounted) return;
        setEnabled(!!s.isEnabled);
        setEnv((s.environment || "sandbox") as any);

        const now = new Date();
        const todayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const last30Days = new Date(todayStart);
        last30Days.setDate(last30Days.getDate() - 30);

        const todaySummary: any = await hospitalApi.summaryFbr({
          from: todayStart.toISOString().split("T")[0],
          to: now.toISOString().split("T")[0],
        });
        const todayCount = todaySummary?.totals?.invoices || 0;
        setInvoicesToday(todayCount);
        setSuccessCount(todaySummary?.totals?.success || 0);
        setFailedCount(todaySummary?.totals?.failed || 0);

        const yesterdaySummary: any = await hospitalApi.summaryFbr({
          from: yesterdayStart.toISOString().split("T")[0],
          to: todayStart.toISOString().split("T")[0],
        });
        const yesterdayCount = yesterdaySummary?.totals?.invoices || 0;
        const pct =
          yesterdayCount > 0
            ? ((todayCount - yesterdayCount) / yesterdayCount) * 100
            : 0;
        setYesterdayPct(Math.round(pct));

        const monthSummary: any = await hospitalApi.summaryFbr({
          from: monthStart.toISOString().split("T")[0],
          to: now.toISOString().split("T")[0],
        });
        setInvoicesMonth(monthSummary?.totals?.invoices || 0);
        setTotalAmount(monthSummary?.totals?.amount || 0);

        const chartSummary: any = await hospitalApi.summaryFbr({
          from: last30Days.toISOString().split("T")[0],
          to: now.toISOString().split("T")[0],
        });

        const daily = chartSummary?.daily || [];
        const chartData = daily.map((d: any) => ({
          date: new Date(d._id).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          count: d.count || 0,
          amount: d.amount || 0,
          success: d.success || 0,
          failed: d.failed || 0,
        }));
        setDailyData(chartData);

        const modules: ModuleStats = { OPD: 0, PHARMACY: 0, LAB: 0, IPD: 0 };
        for (const mod of ["OPD", "PHARMACY", "LAB", "IPD"] as const) {
          const modSummary: any = await hospitalApi.summaryFbr({
            invoiceType: mod,
            from: monthStart.toISOString().split("T")[0],
            to: now.toISOString().split("T")[0],
          });
          modules[mod as keyof ModuleStats] = modSummary?.totals?.invoices || 0;
        }
        setModuleStats(modules);
      } catch (e) {
        console.error("Failed to load FBR dashboard data:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            FBR Dashboard
          </h2>
          <div className="mt-1 text-sm text-slate-500">
            Overview of FBR reporting across modules and environments.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const newVal = !enabled;
              setPendingEnabled(newVal);
              setConfirmOpen(true);
            }}
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${enabled ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
          >
            {enabled ? "● Enabled" : "○ Disabled"}
          </button>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
            ENV: {String(env).toUpperCase()}
          </span>
        </div>
      </div>

      <Hospital_Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="space-y-4">
          <div className="text-lg font-semibold">Confirm</div>
          <div className="text-sm text-slate-700">
            {pendingEnabled ? "Enable" : "Disable"} FBR?
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                const v = pendingEnabled;
                setConfirmOpen(false);
                if (v == null) return;
                await persistEnabled(v);
              }}
              className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white"
            >
              Confirm
            </button>
          </div>
        </div>
      </Hospital_Modal>

      <Hospital_Modal open={errorOpen} onClose={() => setErrorOpen(false)}>
        <div className="space-y-4">
          <div className="text-lg font-semibold">Error</div>
          <div className="text-sm text-slate-700">{errorMsg || "Something went wrong"}</div>
          <div className="flex justify-end">
            <button
              onClick={() => setErrorOpen(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </Hospital_Modal>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Invoices Today</div>
          <div className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {invoicesToday}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            vs yesterday {yesterdayPct >= 0 ? "+" : ""}
            {yesterdayPct}%
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Invoices This Month</div>
          <div className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {invoicesMonth}
          </div>
          <div className="mt-1 text-xs text-slate-500">MTD total</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Total Amount Reported</div>
          <div className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {totalAmount.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500">PKR</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Success / Failed</div>
          <div className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {successCount} / {failedCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">Last 24h</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="font-medium text-slate-800">Invoices per day</div>
            <div className="text-xs text-slate-500">Last 30 days</div>
          </div>
          <div className="mt-4 h-56">
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    stroke="#cbd5e1"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    stroke="#cbd5e1"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="count" fill="#7c3aed" name="Total Invoices" />
                  <Bar dataKey="success" fill="#10b981" name="Success" />
                  <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg bg-linear-to-br from-slate-50 to-slate-100 text-sm text-slate-500">
                Loading chart data...
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="font-medium text-slate-800">
            Module-wise (This Month)
          </div>
          <div className="mt-4 space-y-3">
            {(["OPD", "PHARMACY", "LAB", "IPD"] as const).map((m) => (
              <div key={m} className="flex items-center justify-between">
                <div className="text-sm text-slate-700">{m}</div>
                <div className="text-sm font-semibold text-slate-900">
                  {moduleStats[m]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Hospital_Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="space-y-4">
          <div className="text-lg font-semibold">Confirm</div>
          <div className="text-sm text-slate-700 dark:text-slate-200">
            Are you sure you want to {pendingEnabled ? "Enable" : "Disable"} FBR
            integration globally?
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                const nv = pendingEnabled;
                setConfirmOpen(false);
                if (nv == null) return;
                try {
                  await hospitalApi.updateFbrSettings({ isEnabled: nv });
                  setEnabled(nv);
                } catch {
                  setErrorMsg("Failed to update status");
                  setErrorOpen(true);
                } finally {
                  setPendingEnabled(null);
                }
              }}
              className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800"
            >
              Confirm
            </button>
          </div>
        </div>
      </Hospital_Modal>

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
