import { useState } from 'react'
import { Key, X, Check } from 'lucide-react'
import { hasApiKey, setApiKey, getApiKey } from '../lib/analysis'

export default function ApiKeyBanner() {
  const [showInput, setShowInput] = useState(false)
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(hasApiKey())
  const [dismissed, setDismissed] = useState(false)

  if (saved || dismissed) return null

  const handleSave = () => {
    if (key.trim()) {
      setApiKey(key.trim())
      setSaved(true)
      setShowInput(false)
    }
  }

  if (showInput) {
    return (
      <div className="mx-5 mb-4 p-4 rounded-xl bg-navy-900/40 border border-navy-700/40">
        <label className="block text-xs font-medium text-slate-400 mb-2">Anthropic API Key</label>
        <div className="flex gap-2">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-ant-..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-navy-500"
          />
          <button
            onClick={handleSave}
            className="px-3 py-2 rounded-lg bg-navy-600 active:bg-navy-700 text-white text-sm"
          >
            <Check size={16} />
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Stored locally on your device only. Never sent to our servers.</p>
      </div>
    )
  }

  return (
    <div className="mx-5 mb-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
      <Key size={16} className="text-navy-400 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-xs text-slate-400">
          <button onClick={() => setShowInput(true)} className="text-navy-400 font-medium underline underline-offset-2">
            Add your API key
          </button>
          {' '}for live AI analysis, or explore with demo results.
        </p>
      </div>
      <button onClick={() => setDismissed(true)} className="text-slate-600 active:text-slate-400">
        <X size={14} />
      </button>
    </div>
  )
}
