import React, { useEffect, useState } from "react";
import { hospitalApi } from "../../../utils/api";
import Hospital_Modal from "../../../components/hospital/bed-management/Hospital_Modal";

export default function Hospital_FbrSettings() {
  const [form, setForm] = useState({
    isEnabled: true,
    environment: "sandbox" as "sandbox" | "production",
    ntn: "",
    strn: "",
    posId: "",
    sandboxPosId: "",
    sandboxCode: "",
    productionPosId: "",
    productionCode: "",
    apiToken: "",
    businessName: "",
    branchCode: "",
    invoicePrefix: "HSP",
    applyOPD: true,
    applyPHARMACY: true,
    applyLAB: true,
    applyIPD: true,
    applyDIAGNOSTIC: true,
    applyAESTHETIC: true,
    applySESSION_BILL: true,
  });
  const update = (k: keyof typeof form, v: any) =>
    setForm((p) => ({ ...p, [k]: v }));
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await hospitalApi.getFbrSettings();
        if (!mounted) return;
        setForm((p) => ({
          ...p,
          isEnabled: !!s.isEnabled,
          environment: s.environment || "sandbox",
          ntn: s.ntn || "",
          strn: s.strn || "",
          posId: s.posId || "",
          sandboxPosId: s.sandboxPosId || "",
          sandboxCode: s.sandboxCode || "",
          productionPosId: s.productionPosId || "",
          productionCode: s.productionCode || "",
          businessName: s.businessName || "",
          branchCode: s.branchCode || "",
          invoicePrefix: s.invoicePrefix || "HSP",
          applyOPD: (s.applyModules || []).includes("OPD"),
          applyPHARMACY: (s.applyModules || []).includes("PHARMACY"),
          applyLAB: (s.applyModules || []).includes("LAB"),
          applyIPD: (s.applyModules || []).includes("IPD"),
          applyDIAGNOSTIC: (s.applyModules || []).includes("DIAGNOSTIC"),
          applyAESTHETIC: (s.applyModules || []).includes("AESTHETIC"),
          applySESSION_BILL: (s.applyModules || []).includes("SESSION_BILL"),
        }));
        setHasToken(!!s.hasToken);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const applyModules = [
      form.applyOPD && "OPD",
      form.applyPHARMACY && "PHARMACY",
      form.applyLAB && "LAB",
      form.applyIPD && "IPD",
      form.applyDIAGNOSTIC && "DIAGNOSTIC",
      form.applyAESTHETIC && "AESTHETIC",
      form.applySESSION_BILL && "SESSION_BILL",
    ].filter(Boolean) as string[];
    const payload: any = {
      isEnabled: form.isEnabled,
      environment: form.environment,
      ntn: form.ntn,
      strn: form.strn,
      posId: form.posId,
      sandboxPosId: form.sandboxPosId,
      sandboxCode: form.sandboxCode,
      productionPosId: form.productionPosId,
      productionCode: form.productionCode,
      businessName: form.businessName,
      branchCode: form.branchCode,
      invoicePrefix: form.invoicePrefix,
      applyModules,
    };
    if (form.apiToken) payload.apiToken = form.apiToken;
    await hospitalApi.updateFbrSettings(payload);
    setHasToken(!!form.apiToken || hasToken);
    update("apiToken", "");
    setSavedOpen(true);
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">FBR Settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configure environment, credentials, and module scope. Changes take
            effect immediately.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${form.isEnabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-50 text-slate-700 border border-slate-200"}`}
          >
            {form.isEnabled ? "Enabled" : "Disabled"}
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
            {form.environment.toUpperCase()}
          </span>
          {hasToken && (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
              Token set
            </span>
          )}
        </div>
      </div>
      <form
        onSubmit={save}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        {loading && (
          <div className="mb-3 text-sm text-slate-500">Loading settings…</div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              FBR Status
            </label>
            <select
              value={form.isEnabled ? "enabled" : "disabled"}
              onChange={(e) =>
                update("isEnabled", e.target.value === "enabled")
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            >
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Environment
            </label>
            <select
              value={form.environment}
              onChange={(e) => update("environment", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Invoice Prefix
            </label>
            <input
              value={form.invoicePrefix}
              onChange={(e) => update("invoicePrefix", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              placeholder="HSP / OPD / PHM"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              NTN Number
            </label>
            <input
              value={form.ntn}
              onChange={(e) => update("ntn", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              STRN Number (optional)
            </label>
            <input
              value={form.strn}
              onChange={(e) => update("strn", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              POS ID
            </label>
            <input
              value={form.posId}
              onChange={(e) => update("posId", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Sandbox POS ID
            </label>
            <input
              value={form.sandboxPosId}
              onChange={(e) => update("sandboxPosId", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Sandbox Code
            </label>
            <input
              value={form.sandboxCode}
              onChange={(e) => update("sandboxCode", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Production POS ID
            </label>
            <input
              value={form.productionPosId}
              onChange={(e) => update("productionPosId", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Production Code
            </label>
            <input
              value={form.productionCode}
              onChange={(e) => update("productionCode", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              FBR API Token
            </label>
            <input
              value={form.apiToken}
              onChange={(e) => update("apiToken", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              type="password"
              placeholder="••••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Business Name
            </label>
            <input
              value={form.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Branch Code (optional)
            </label>
            <input
              value={form.branchCode}
              onChange={(e) => update("branchCode", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>
        </div>
        <div className="mt-4 rounded-md border border-slate-200 p-3 bg-slate-50/60">
          <div className="font-medium text-slate-800">Apply To Modules</div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm text-slate-700">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.applyOPD}
                onChange={(e) => update("applyOPD", e.target.checked)}
              />{" "}
              OPD
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.applyPHARMACY}
                onChange={(e) => update("applyPHARMACY", e.target.checked)}
              />{" "}
              Pharmacy
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.applyLAB}
                onChange={(e) => update("applyLAB", e.target.checked)}
              />{" "}
              Lab
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.applyIPD}
                onChange={(e) => update("applyIPD", e.target.checked)}
              />{" "}
              IPD
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.applyDIAGNOSTIC}
                onChange={(e) => update("applyDIAGNOSTIC", e.target.checked)}
              />{" "}
              Diagnostic
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.applyAESTHETIC}
                onChange={(e) => update("applyAESTHETIC", e.target.checked)}
              />{" "}
              Aesthetic
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.applySESSION_BILL}
                onChange={(e) => update("applySESSION_BILL", e.target.checked)}
              />{" "}
              Session Bill
            </label>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white shadow hover:bg-violet-800"
          >
            Save
          </button>
        </div>
      </form>

      <Hospital_Modal open={savedOpen} onClose={() => setSavedOpen(false)}>
        <div className="space-y-4">
          <div className="text-lg font-semibold">Saved</div>
          <div className="text-sm text-slate-700 dark:text-slate-200">
            FBR settings saved.
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setSavedOpen(false)}
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
