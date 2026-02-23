import React, { useState } from "react";
import Hospital_Modal from "../../../components/hospital/bed-management/Hospital_Modal";

export default function Hospital_FbrCredentials() {
  const [mask, setMask] = useState(true);
  const [form, setForm] = useState({ posId: "", apiToken: "" });
  const update = (k: keyof typeof form, v: any) =>
    setForm((p) => ({ ...p, [k]: v }));
  const [infoOpen, setInfoOpen] = useState(false);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setInfoOpen(true);
  };
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">FBR Credentials</h2>
      <form
        onSubmit={save}
        className="rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              POS ID
            </label>
            <input
              value={form.posId}
              onChange={(e) => update("posId", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="POS-TEST-xxxxx"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              API Token
            </label>
            <div className="flex items-center gap-2">
              <input
                value={form.apiToken}
                onChange={(e) => update("apiToken", e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                type={mask ? "password" : "text"}
                placeholder="••••••••••"
              />
              <button
                type="button"
                onClick={() => setMask((m) => !m)}
                className="mt-1 rounded-md border border-slate-300 px-2 py-2 text-xs"
              >
                {mask ? "Show" : "Hide"}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white"
          >
            Save
          </button>
        </div>
      </form>

      <Hospital_Modal open={infoOpen} onClose={() => setInfoOpen(false)}>
        <div className="space-y-4">
          <div className="text-lg font-semibold">Info</div>
          <div className="text-sm text-slate-700 dark:text-slate-200">
            This is a placeholder UI. Saving will be wired to backend later with
            encryption and RBAC.
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setInfoOpen(false)}
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
