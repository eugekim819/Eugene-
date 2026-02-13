import { useNavigate } from 'react-router-dom'
import { FileSearch, ShieldQuestion, GitFork, Scale, ArrowRight } from 'lucide-react'
import ApiKeyBanner from '../components/ApiKeyBanner'

const tools = [
  {
    to: '/contract',
    icon: FileSearch,
    title: 'Contract Review',
    desc: 'Paste or upload a contract — get a risk summary with flagged clauses, missing protections, and negotiation points.',
    color: 'from-blue-600/20 to-blue-800/10 border-blue-700/30',
    iconColor: 'text-blue-400',
  },
  {
    to: '/risk',
    icon: ShieldQuestion,
    title: 'Risk Assessment',
    desc: '"Can we do this?" — describe a business scenario, get a structured risk analysis with recommendations.',
    color: 'from-amber-600/20 to-amber-800/10 border-amber-700/30',
    iconColor: 'text-amber-400',
  },
  {
    to: '/issues',
    icon: GitFork,
    title: 'Issue Spotter',
    desc: 'Map the legal landscape for a business decision — regulatory, IP, employment, liability, and more.',
    color: 'from-emerald-600/20 to-emerald-800/10 border-emerald-700/30',
    iconColor: 'text-emerald-400',
  },
  {
    to: '/regulatory',
    icon: Scale,
    title: 'Regulatory Check',
    desc: 'Quick compliance gut-check against GDPR, CCPA, SOX, HIPAA, and other frameworks.',
    color: 'from-purple-600/20 to-purple-800/10 border-purple-700/30',
    iconColor: 'text-purple-400',
  },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="h-full scroll-area">
      <div className="px-5 pt-14 pb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          CounselDesk
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Substantive legal analysis, on the go.
        </p>
      </div>

      <ApiKeyBanner />

      <div className="px-5 pb-8 space-y-3">
        {tools.map(({ to, icon: Icon, title, desc, color, iconColor }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={`w-full text-left p-4 rounded-2xl border bg-gradient-to-br ${color} active:scale-[0.98] transition-transform`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`${iconColor}`}>
                  <Icon size={22} />
                </div>
                <h2 className="text-base font-semibold text-white">{title}</h2>
              </div>
              <ArrowRight size={16} className="text-slate-500 mt-1" />
            </div>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">{desc}</p>
          </button>
        ))}
      </div>

      <div className="px-5 pb-10">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <p className="text-xs text-slate-500 leading-relaxed">
            CounselDesk provides AI-powered analysis to support your legal reasoning.
            All outputs are decision support — not legal advice. You are the lawyer.
          </p>
        </div>
      </div>
    </div>
  )
}
