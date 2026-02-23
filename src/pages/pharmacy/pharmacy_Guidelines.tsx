export default function Pharmacy_Guidelines() {
  const shortcuts = [
    { label: 'Open POS', keys: 'Ctrl + N' },
    { label: 'Open Reports', keys: 'Shift + R' },
    { label: 'Open Inventory', keys: 'Shift + I' },
    { label: 'Focus inventory search', keys: 'Shift + F' },
    { label: 'Focus POS search', keys: 'Ctrl + D' },
    { label: 'Navigate medicines', keys: 'Arrow Up' },
    { label: 'Navigate medicines', keys: 'Arrow Down' },
    { label: 'Add selected to cart', keys: 'Enter' },
    { label: 'Remove selected from cart', keys: 'Delete' },
    { label: 'Increase qty', keys: '+' },
    { label: 'Decrease qty', keys: '-' },
    { label: 'Process payment', keys: 'Ctrl + P' },
  ]

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-slate-800">Guidelines & Shortcuts</div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-800">How to use this software</div>
        <div className="p-4">
          <div className="mb-3 text-sm text-slate-600">Keyboard Shortcuts</div>
          <table className="min-w-full text-left text-sm">
            <tbody className="divide-y divide-slate-200">
              {shortcuts.map((s, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-slate-700">{s.label}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">{s.keys}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
