import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, Loader2 } from 'lucide-react'
import { checkRegulatory } from '../lib/analysis'

const frameworks = [
  { id: 'gdpr', label: 'GDPR', region: 'EU' },
  { id: 'ccpa', label: 'CCPA/CPRA', region: 'CA' },
  { id: 'hipaa', label: 'HIPAA', region: 'US' },
  { id: 'sox', label: 'SOX', region: 'US' },
  { id: 'pci', label: 'PCI-DSS', region: 'Global' },
  { id: 'ada', label: 'ADA/WCAG', region: 'US' },
  { id: 'coppa', label: 'COPPA', region: 'US' },
  { id: 'ferpa', label: 'FERPA', region: 'US' },
  { id: 'ftc', label: 'FTC Act §5', region: 'US' },
  { id: 'canspam', label: 'CAN-SPAM', region: 'US' },
  { id: 'ai_eu', label: 'EU AI Act', region: 'EU' },
  { id: 'export', label: 'Export Controls (EAR/ITAR)', region: 'US' },
]

export default function RegulatoryChecker() {
  const navigate = useNavigate()
  const [situation, setSituation] = useState('')
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const handleCheck = async () => {
    if (!situation.trim() || selected.length === 0) return
    setLoading(true)
    try {
      const selectedNames = selected.map(id => frameworks.find(f => f.id === id)?.label).filter(Boolean)
      const result = await checkRegulatory(situation, selectedNames)
      navigate('/result', { state: { result, title: 'Regulatory Analysis', type: 'regulatory' } })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full scroll-area">
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center gap-3">
          <Scale size={22} className="text-purple-400" />
          <h1 className="text-xl font-bold text-white">Regulatory Check</h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Quick compliance gut-check against common frameworks.
        </p>
      </div>

      <div className="px-5 space-y-5 pb-8">
        {/* Framework selection */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Which frameworks? <span className="text-slate-600">(select all relevant)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {frameworks.map(({ id, label, region }) => (
              <button
                key={id}
                onClick={() => toggle(id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selected.includes(id)
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 active:bg-slate-700'
                }`}
              >
                {label}
                <span className="ml-1 text-slate-600">{region}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Situation */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Describe the situation or activity
          </label>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder='e.g., "We want to use customer support chat transcripts to fine-tune an AI model. Transcripts include customer names, emails, and sometimes health-related questions."'
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-navy-500 min-h-[7rem] max-h-[14rem] resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleCheck}
          disabled={loading || !situation.trim() || selected.length === 0}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-purple-600 active:bg-purple-700 text-white flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Checking compliance...
            </>
          ) : (
            `Check Against ${selected.length || '...'} Framework${selected.length !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </div>
  )
}
