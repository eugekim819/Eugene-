import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSearch, Camera, ClipboardPaste, Loader2, ChevronDown } from 'lucide-react'
import { analyzeContract } from '../lib/analysis'

const contractTypes = [
  'Auto-detect',
  'Vendor / SaaS Agreement',
  'Customer Contract',
  'NDA / Confidentiality',
  'Employment / Consulting',
  'License Agreement',
  'Partnership / JV',
  'Lease / Real Estate',
  'M&A / LOI',
]

export default function ContractAnalyzer() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [contractType, setContractType] = useState('Auto-detect')
  const [focusAreas, setFocusAreas] = useState([])
  const [loading, setLoading] = useState(false)

  const areas = [
    'Indemnification', 'Liability Caps', 'IP Assignment', 'Termination',
    'Data Privacy', 'Non-compete', 'Governing Law', 'Auto-renewal',
    'Warranty', 'Force Majeure',
  ]

  const toggleArea = (area) => {
    setFocusAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    )
  }

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const result = await analyzeContract(text, contractType, focusAreas)
      navigate('/result', { state: { result, title: 'Contract Analysis', type: 'contract' } })
    } finally {
      setLoading(false)
    }
  }

  const handlePaste = async () => {
    try {
      const clip = await navigator.clipboard.readText()
      if (clip) setText(prev => prev + clip)
    } catch {
      // Clipboard API may not be available
    }
  }

  return (
    <div className="h-full scroll-area">
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center gap-3">
          <FileSearch size={22} className="text-blue-400" />
          <h1 className="text-xl font-bold text-white">Contract Review</h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Paste contract text to get a structured risk analysis.
        </p>
      </div>

      <div className="px-5 space-y-5 pb-8">
        {/* Contract type */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Contract Type</label>
          <div className="relative">
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              className="w-full appearance-none bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-navy-500 pr-10"
            >
              {contractTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Contract text */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-400">Contract Text</label>
            <button
              onClick={handlePaste}
              className="flex items-center gap-1 text-xs text-navy-400 active:text-navy-300"
            >
              <ClipboardPaste size={12} />
              Paste
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the contract text here, or the key clauses you want reviewed..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-navy-500 min-h-[10rem] max-h-[20rem] resize-none"
          />
          <p className="mt-1 text-xs text-slate-600">
            {text.length > 0 ? `${text.length.toLocaleString()} characters` : 'Tip: paste even a few key clauses for targeted review'}
          </p>
        </div>

        {/* Focus areas */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Focus Areas <span className="text-slate-600">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {areas.map(area => (
              <button
                key={area}
                onClick={() => toggleArea(area)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  focusAreas.includes(area)
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 active:bg-slate-700'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleAnalyze}
          disabled={loading || !text.trim()}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 active:bg-blue-700 text-white flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Contract'
          )}
        </button>
      </div>
    </div>
  )
}
