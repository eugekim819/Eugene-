import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GitFork, Loader2 } from 'lucide-react'
import { spotIssues } from '../lib/analysis'

const decisionTypes = [
  { value: 'expansion', label: 'Market Expansion', desc: 'New geography, new market segment' },
  { value: 'product', label: 'Product / Feature Launch', desc: 'New product, feature, or service' },
  { value: 'partnership', label: 'Partnership / Deal', desc: 'JV, strategic alliance, major vendor' },
  { value: 'ma', label: 'M&A / Investment', desc: 'Acquisition, merger, investment' },
  { value: 'restructuring', label: 'Restructuring', desc: 'Reorg, layoffs, entity changes' },
  { value: 'other', label: 'Other', desc: 'Anything else' },
]

export default function IssueSpotter() {
  const navigate = useNavigate()
  const [decision, setDecision] = useState('')
  const [decisionType, setDecisionType] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSpot = async () => {
    if (!decision.trim()) return
    setLoading(true)
    try {
      const result = await spotIssues(decision, decisionType, context)
      navigate('/result', { state: { result, title: 'Issue Analysis', type: 'issues' } })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full scroll-area">
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center gap-3">
          <GitFork size={22} className="text-emerald-400" />
          <h1 className="text-xl font-bold text-white">Issue Spotter</h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Map the legal landscape for a business decision.
        </p>
      </div>

      <div className="px-5 space-y-5 pb-8">
        {/* Decision type */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            What kind of decision?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {decisionTypes.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setDecisionType(value)}
                className={`text-left p-3 rounded-xl text-xs transition-colors ${
                  decisionType === value
                    ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 active:bg-slate-700'
                }`}
              >
                <div className="font-medium">{label}</div>
                <div className="text-slate-500 mt-0.5 text-[0.65rem]">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Decision description */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Describe the decision
          </label>
          <textarea
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            placeholder='e.g., "We want to launch our SaaS product in Germany and France, starting Q3. We currently have no EU entity and store all user data in AWS us-east-1."'
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-navy-500 min-h-[7rem] max-h-[14rem] resize-none"
          />
        </div>

        {/* Additional context */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Additional context <span className="text-slate-600">(optional)</span>
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Existing contracts, prior decisions, constraints, timeline..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-navy-500 min-h-[3.5rem] max-h-[8rem] resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSpot}
          disabled={loading || !decision.trim()}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-600 active:bg-emerald-700 text-white flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Spotting issues...
            </>
          ) : (
            'Spot Issues'
          )}
        </button>
      </div>
    </div>
  )
}
