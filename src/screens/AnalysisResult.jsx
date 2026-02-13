import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Share2, Copy, Check } from 'lucide-react'
import { useState } from 'react'

const typeColors = {
  contract: 'text-blue-400',
  risk: 'text-amber-400',
  issues: 'text-emerald-400',
  regulatory: 'text-purple-400',
}

export default function AnalysisResult() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  if (!state?.result) {
    navigate('/', { replace: true })
    return null
  }

  const { result, title, type } = state

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.raw || result.html?.replace(/<[^>]+>/g, '') || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleShare = async () => {
    try {
      await navigator.share({
        title: `CounselDesk — ${title}`,
        text: result.raw || '',
      })
    } catch {}
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-14 pb-4 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-slate-400 active:text-white"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-slate-800 active:bg-slate-700"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-slate-400" />}
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-lg bg-slate-800 active:bg-slate-700"
            >
              <Share2 size={16} className="text-slate-400" />
            </button>
          </div>
        </div>
        <h1 className={`text-lg font-bold mt-3 ${typeColors[type] || 'text-white'}`}>
          {title}
        </h1>
        {result.summary && (
          <p className="mt-1 text-sm text-slate-300">{result.summary}</p>
        )}
        {result.riskLevel && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Overall Risk:</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              result.riskLevel === 'high' ? 'bg-red-900/40 text-red-400 border border-red-700/40' :
              result.riskLevel === 'medium' ? 'bg-amber-900/40 text-amber-400 border border-amber-700/40' :
              'bg-green-900/40 text-green-400 border border-green-700/40'
            }`}>
              {result.riskLevel.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Analysis content */}
      <div className="flex-1 scroll-area">
        <div className="px-5 py-5">
          {result.sections?.map((section, i) => (
            <div key={i} className="mb-5">
              <h3 className={`text-sm font-bold mb-2 ${typeColors[type] || 'text-navy-300'}`}>
                {section.heading}
              </h3>
              {section.items ? (
                <ul className="space-y-2">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex gap-2 text-sm">
                      <span className="mt-1 flex-shrink-0">
                        {item.severity === 'high' ? '🔴' : item.severity === 'medium' ? '🟡' : '🟢'}
                      </span>
                      <div>
                        <span className="text-slate-200">{item.text}</span>
                        {item.detail && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : section.text ? (
                <p className="text-sm text-slate-300 leading-relaxed">{section.text}</p>
              ) : null}
            </div>
          ))}

          {result.bottomLine && (
            <div className="mt-6 p-4 rounded-xl bg-slate-900/80 border border-slate-700">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Bottom Line</h3>
              <p className="text-sm text-white leading-relaxed">{result.bottomLine}</p>
            </div>
          )}

          {result.nextSteps && result.nextSteps.length > 0 && (
            <div className="mt-5 p-4 rounded-xl bg-slate-900/80 border border-slate-700">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Recommended Next Steps</h3>
              <ol className="list-decimal list-inside space-y-1.5">
                {result.nextSteps.map((step, i) => (
                  <li key={i} className="text-sm text-slate-300">{step}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-6 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <p className="text-xs text-slate-500 leading-relaxed">
              This analysis is AI-generated decision support. It is not legal advice and should not be relied upon
              as a substitute for professional judgment. Always verify key points independently.
            </p>
          </div>

          <div className="h-8" />
        </div>
      </div>
    </div>
  )
}
