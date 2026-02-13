import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldQuestion, Loader2, ChevronDown } from 'lucide-react'
import { assessRisk } from '../lib/analysis'

const jurisdictions = [
  'United States (Federal)',
  'United States (California)',
  'United States (New York)',
  'United States (Delaware)',
  'United States (Texas)',
  'European Union',
  'United Kingdom',
  'Canada',
  'Multi-jurisdictional',
  'Other',
]

const industries = [
  'Technology / SaaS',
  'Healthcare',
  'Financial Services',
  'E-commerce / Retail',
  'Manufacturing',
  'Media / Entertainment',
  'Professional Services',
  'Real Estate',
  'Other',
]

export default function RiskAssessor() {
  const navigate = useNavigate()
  const [scenario, setScenario] = useState('')
  const [jurisdiction, setJurisdiction] = useState('United States (Federal)')
  const [industry, setIndustry] = useState('Technology / SaaS')
  const [urgency, setUrgency] = useState('normal')
  const [loading, setLoading] = useState(false)

  const handleAssess = async () => {
    if (!scenario.trim()) return
    setLoading(true)
    try {
      const result = await assessRisk(scenario, jurisdiction, industry, urgency)
      navigate('/result', { state: { result, title: 'Risk Assessment', type: 'risk' } })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full scroll-area">
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center gap-3">
          <ShieldQuestion size={22} className="text-amber-400" />
          <h1 className="text-xl font-bold text-white">Risk Assessment</h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          "Can we do this?" — get a structured risk analysis.
        </p>
      </div>

      <div className="px-5 space-y-5 pb-8">
        {/* Scenario */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            What does the business want to do?
          </label>
          <textarea
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder='e.g., "Marketing wants to scrape competitor pricing from their public website and display it on ours" or "Sales agreed to unlimited liability with a Fortune 500 customer"'
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-navy-500 min-h-[7rem] max-h-[14rem] resize-none"
          />
        </div>

        {/* Jurisdiction & Industry */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Jurisdiction</label>
            <div className="relative">
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full appearance-none bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-navy-500 pr-8"
              >
                {jurisdictions.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Industry</label>
            <div className="relative">
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full appearance-none bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-navy-500 pr-8"
              >
                {industries.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Urgency */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">How urgent?</label>
          <div className="flex gap-2">
            {[
              { value: 'fyi', label: 'Just exploring' },
              { value: 'normal', label: 'Need to decide soon' },
              { value: 'urgent', label: 'Need answer now' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setUrgency(value)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  urgency === value
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 active:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleAssess}
          disabled={loading || !scenario.trim()}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-amber-600 active:bg-amber-700 text-white flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Analyzing risk...
            </>
          ) : (
            'Assess Risk'
          )}
        </button>
      </div>
    </div>
  )
}
