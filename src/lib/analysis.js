/**
 * CounselDesk Analysis Engine
 *
 * Integrates with the Claude API to provide substantive legal analysis.
 * When no API key is configured, uses structured demo responses to
 * demonstrate the app's capabilities.
 */

const API_KEY_STORAGE = 'counseldesk_api_key'
const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5-20250929'

// --- API Key Management ---

export function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || ''
}

export function setApiKey(key) {
  if (key) {
    localStorage.setItem(API_KEY_STORAGE, key)
  } else {
    localStorage.removeItem(API_KEY_STORAGE)
  }
}

export function hasApiKey() {
  return !!getApiKey()
}

// --- Core API Call ---

async function callClaude(systemPrompt, userMessage) {
  const apiKey = getApiKey()
  if (!apiKey) return null

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text || ''
  return text
}

function parseJsonResponse(text) {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[1] || jsonMatch[0]
      return JSON.parse(jsonStr)
    } catch {
      // Fall through to raw text handling
    }
  }
  return null
}

// --- Analysis Functions ---

const RESPONSE_FORMAT = `
Respond in JSON with this exact structure:
{
  "summary": "One-sentence executive summary",
  "riskLevel": "low" | "medium" | "high",
  "sections": [
    {
      "heading": "Section Title",
      "items": [
        { "text": "Key point", "detail": "Explanation", "severity": "low" | "medium" | "high" }
      ]
    }
  ],
  "bottomLine": "Direct, actionable conclusion for the GC",
  "nextSteps": ["Step 1", "Step 2"],
  "raw": "Plain text version of the full analysis"
}
Do NOT include any text outside the JSON.`

export async function analyzeContract(text, contractType, focusAreas) {
  const system = `You are a senior legal analyst supporting an in-house General Counsel.
You analyze contracts with a focus on risk identification, missing protections, and negotiation leverage.
Be specific and practical — the GC needs actionable analysis, not academic commentary.
Flag provisions that are unusual, one-sided, or missing. Note where the company has leverage to negotiate.
${RESPONSE_FORMAT}`

  const userMsg = `Analyze this contract for legal risks and key issues.

Contract Type: ${contractType}
${focusAreas.length > 0 ? `Focus Areas: ${focusAreas.join(', ')}` : 'Review all major risk areas.'}

CONTRACT TEXT:
${text}`

  const apiResult = await callClaude(system, userMsg)
  if (apiResult) {
    const parsed = parseJsonResponse(apiResult)
    if (parsed) return parsed
    return { summary: 'Analysis complete', sections: [], bottomLine: apiResult, raw: apiResult }
  }

  return demoContractResult(contractType, focusAreas)
}

export async function assessRisk(scenario, jurisdiction, industry, urgency) {
  const system = `You are a senior legal analyst supporting an in-house General Counsel.
You assess business scenarios for legal risk with a structured framework:
1. Identify the core legal risks (litigation, regulatory, contractual, reputational)
2. Assess likelihood and severity of each risk
3. Identify risk mitigation options
4. Give a clear recommendation (proceed / proceed with conditions / don't proceed / need more info)
Be direct and practical. The GC needs to advise the business team.
${RESPONSE_FORMAT}`

  const userMsg = `Assess the legal risk of this business scenario:

SCENARIO: ${scenario}
JURISDICTION: ${jurisdiction}
INDUSTRY: ${industry}
URGENCY: ${urgency}

Provide a structured risk assessment with clear recommendations.`

  const apiResult = await callClaude(system, userMsg)
  if (apiResult) {
    const parsed = parseJsonResponse(apiResult)
    if (parsed) return parsed
    return { summary: 'Assessment complete', sections: [], bottomLine: apiResult, raw: apiResult }
  }

  return demoRiskResult(scenario)
}

export async function spotIssues(decision, decisionType, context) {
  const system = `You are a senior legal analyst supporting an in-house General Counsel.
You perform comprehensive legal issue-spotting for business decisions.
Cover ALL relevant legal domains: regulatory, employment, IP, data privacy, tax,
corporate governance, contracts, antitrust, securities, environmental, international trade.
For each issue, indicate severity, whether it's a blocker or manageable, and what needs to happen.
${RESPONSE_FORMAT}`

  const userMsg = `Spot all legal issues for this business decision:

DECISION TYPE: ${decisionType || 'General'}
DECISION: ${decision}
${context ? `ADDITIONAL CONTEXT: ${context}` : ''}

Provide a comprehensive issue-spotting analysis organized by legal domain.`

  const apiResult = await callClaude(system, userMsg)
  if (apiResult) {
    const parsed = parseJsonResponse(apiResult)
    if (parsed) return parsed
    return { summary: 'Analysis complete', sections: [], bottomLine: apiResult, raw: apiResult }
  }

  return demoIssueResult(decisionType)
}

export async function checkRegulatory(situation, frameworks) {
  const system = `You are a senior legal analyst specializing in regulatory compliance,
supporting an in-house General Counsel.
For each regulatory framework specified, analyze whether the described activity is likely
compliant, non-compliant, or in a gray area. Be specific about which provisions apply.
Identify concrete compliance steps needed.
${RESPONSE_FORMAT}`

  const userMsg = `Check this activity against the following regulatory frameworks:

FRAMEWORKS: ${frameworks.join(', ')}
SITUATION: ${situation}

For each framework, assess compliance status and required actions.`

  const apiResult = await callClaude(system, userMsg)
  if (apiResult) {
    const parsed = parseJsonResponse(apiResult)
    if (parsed) return parsed
    return { summary: 'Check complete', sections: [], bottomLine: apiResult, raw: apiResult }
  }

  return demoRegulatoryResult(frameworks)
}

// --- Demo Responses (used when no API key is configured) ---

function demoContractResult(contractType, focusAreas) {
  return {
    summary: `${contractType !== 'Auto-detect' ? contractType : 'Contract'} review identified several areas requiring attention.`,
    riskLevel: 'medium',
    sections: [
      {
        heading: 'Indemnification',
        items: [
          { text: 'Broad mutual indemnification clause favors counterparty', detail: 'Indemnification scope includes "any and all claims" without carve-outs for the indemnifying party\'s own negligence. Consider narrowing to third-party IP claims and breaches of reps/warranties.', severity: 'high' },
          { text: 'No cap on indemnification obligations', detail: 'Indemnification obligations are uncapped, creating potentially unlimited exposure. Industry standard is to cap at 1-2x annual contract value.', severity: 'high' },
        ],
      },
      {
        heading: 'Liability',
        items: [
          { text: 'Consequential damages waiver is one-sided', detail: 'Only our company waives consequential damages. This should be mutual.', severity: 'medium' },
          { text: 'Liability cap is reasonable at 12 months of fees', detail: 'This is within market range for this type of agreement.', severity: 'low' },
        ],
      },
      {
        heading: 'IP & Data',
        items: [
          { text: 'Broad license grant to "derivative works" from your data', detail: 'Section 4.2 grants counterparty a license to derivative works created from your data. This could include trained models, analytics, or aggregated datasets. Consider restricting.', severity: 'high' },
          { text: 'No clear data return/deletion on termination', detail: 'Agreement is silent on what happens to your data post-termination. Add explicit data return and certified deletion requirements.', severity: 'medium' },
        ],
      },
      {
        heading: 'Termination',
        items: [
          { text: 'Auto-renewal with 90-day notice requirement', detail: 'Contract auto-renews annually unless 90 days written notice is given. Consider reducing to 30-60 days or switching to opt-in renewal.', severity: 'medium' },
          { text: 'No termination for convenience', detail: 'You can only terminate for cause. Consider adding a termination for convenience with 30-60 days notice.', severity: 'medium' },
        ],
      },
    ],
    bottomLine: 'The contract is generally workable but has three high-risk items that should be negotiated before signing: uncapped indemnification, the broad data derivative works license, and the one-sided consequential damages waiver. You have leverage — push back on these.',
    nextSteps: [
      'Redline indemnification to add a cap (suggest 2x annual fees) and mutual structure',
      'Narrow the data license in Section 4.2 to exclude derivative works',
      'Make the consequential damages waiver mutual',
      'Add data return/deletion obligations on termination',
      'Consider adding termination for convenience clause',
    ],
    raw: 'Contract review analysis - see structured results above.',
  }
}

function demoRiskResult(scenario) {
  return {
    summary: 'This scenario presents moderate legal risk that can likely be managed with proper guardrails.',
    riskLevel: 'medium',
    sections: [
      {
        heading: 'Legal Risk Identification',
        items: [
          { text: 'Potential unfair competition / tortious interference claims', detail: 'If the activity involves competitor data or relationships, there is risk of tortious interference claims. Assess whether the activity could be viewed as improper by a court.', severity: 'medium' },
          { text: 'Contractual restrictions may apply', detail: 'Review existing agreements (NDAs, vendor agreements, customer contracts) for non-compete, non-solicitation, or exclusivity clauses that could constrain this activity.', severity: 'medium' },
          { text: 'Regulatory compliance requirements', detail: 'Depending on the industry and jurisdiction, this activity may trigger specific regulatory obligations. A thorough regulatory mapping is recommended.', severity: 'medium' },
        ],
      },
      {
        heading: 'Likelihood & Impact Assessment',
        items: [
          { text: 'Litigation risk: Moderate', detail: 'Based on the scenario, the probability of a legal challenge is moderate (25-40%). If challenged, exposure could be significant.', severity: 'medium' },
          { text: 'Regulatory risk: Low to Moderate', detail: 'The regulatory risk depends on whether specific frameworks apply. Absent a clear regulatory prohibition, the risk is manageable.', severity: 'low' },
          { text: 'Reputational risk: Low', detail: 'Unless the activity involves consumer-facing elements that could generate negative press, reputational risk is limited.', severity: 'low' },
        ],
      },
      {
        heading: 'Mitigation Options',
        items: [
          { text: 'Implement internal guardrails and documentation', detail: 'Document the business rationale. Ensure the activity is conducted through proper channels with appropriate oversight.', severity: 'low' },
          { text: 'Obtain appropriate consents or licenses', detail: 'If contractual restrictions exist, seek amendments or waivers. If third-party data is involved, ensure proper rights.', severity: 'medium' },
          { text: 'Consider phased rollout to limit exposure', detail: 'Start with a limited pilot to test the waters before full-scale implementation.', severity: 'low' },
        ],
      },
    ],
    bottomLine: 'Recommendation: PROCEED WITH CONDITIONS. The activity is not inherently prohibited, but guardrails are needed. The business should document its rationale, ensure contractual compliance, and consider a phased approach to limit exposure while validating the strategy.',
    nextSteps: [
      'Review all relevant existing agreements for restrictive covenants',
      'Document the legitimate business purpose for this activity',
      'Implement data handling protocols if third-party information is involved',
      'Consider a limited pilot before full rollout',
      'Set up a 90-day review checkpoint to reassess risk',
    ],
    raw: 'Risk assessment analysis - see structured results above.',
  }
}

function demoIssueResult(decisionType) {
  const isExpansion = decisionType === 'expansion'

  return {
    summary: `Identified issues across ${isExpansion ? '7' : '6'} legal domains requiring attention before proceeding.`,
    riskLevel: 'medium',
    sections: [
      {
        heading: 'Data Privacy & Protection',
        items: [
          { text: 'Data transfer mechanisms required', detail: 'If expanding to new jurisdictions, assess whether data transfers trigger GDPR, CCPA, or local equivalents. Standard Contractual Clauses or adequacy decisions may be needed.', severity: 'high' },
          { text: 'Privacy policy and notice updates', detail: 'Consumer-facing privacy notices likely need updating to reflect new data processing activities or jurisdictions.', severity: 'medium' },
        ],
      },
      {
        heading: 'Employment & Labor',
        items: [
          { text: 'Local employment law compliance', detail: 'Hiring in new jurisdictions triggers local employment law requirements: offer letters, benefits, termination protections, works council requirements (if EU).', severity: 'high' },
          { text: 'Independent contractor classification risk', detail: 'If using contractors instead of employees, assess misclassification risk under local law. Many jurisdictions are tightening enforcement.', severity: 'medium' },
        ],
      },
      {
        heading: 'Corporate & Tax',
        items: [
          { text: 'Entity formation requirements', detail: 'Operating in a new jurisdiction may require forming a local entity, registering as a foreign entity, or obtaining a business license.', severity: 'medium' },
          { text: 'Transfer pricing implications', detail: 'Inter-company transactions with new entities must comply with transfer pricing rules to avoid tax authority challenges.', severity: 'medium' },
        ],
      },
      {
        heading: 'Intellectual Property',
        items: [
          { text: 'Trademark clearance in new markets', detail: 'Before launching in a new market, conduct trademark searches to ensure the brand name and product names are available and not infringing.', severity: 'medium' },
          { text: 'IP assignment chain review', detail: 'Ensure all IP developed by employees/contractors is properly assigned through the new entity structure.', severity: 'low' },
        ],
      },
      {
        heading: 'Regulatory & Compliance',
        items: [
          { text: 'Industry-specific licensing requirements', detail: 'Certain industries require local licenses or regulatory approvals before commencing operations. Timelines can be 3-12 months.', severity: 'high' },
          { text: 'Export control screening', detail: 'If technology is involved, assess whether export control restrictions (EAR/ITAR) limit the ability to share technology or IP across borders.', severity: 'medium' },
        ],
      },
      {
        heading: 'Contracts & Commercial',
        items: [
          { text: 'Customer agreement updates for new jurisdictions', detail: 'Terms of service, governing law, and dispute resolution clauses may need updating for new markets.', severity: 'medium' },
          { text: 'Vendor agreement review', detail: 'Existing vendor agreements may need amendments to cover new jurisdictions or use cases.', severity: 'low' },
        ],
      },
    ],
    bottomLine: 'No single issue is a deal-breaker, but three areas need attention before proceeding: data privacy transfer mechanisms, local employment compliance, and industry-specific licensing. Build these into the project timeline — they will add 2-4 months to readiness.',
    nextSteps: [
      'Engage local counsel in target jurisdiction(s) for employment and regulatory guidance',
      'Map data flows and implement appropriate transfer mechanisms',
      'Conduct trademark clearance search in target markets',
      'Assess entity structure options with tax advisors',
      'Review and update customer-facing agreements for new jurisdictions',
      'Build regulatory timeline into the project plan',
    ],
    raw: 'Issue-spotting analysis - see structured results above.',
  }
}

function demoRegulatoryResult(frameworks) {
  const sections = frameworks.map(fw => {
    const items = getFrameworkItems(fw)
    return { heading: fw, items }
  })

  return {
    summary: `Compliance assessment across ${frameworks.length} framework${frameworks.length > 1 ? 's' : ''} identified areas requiring action.`,
    riskLevel: frameworks.some(f => ['GDPR', 'HIPAA'].includes(f)) ? 'high' : 'medium',
    sections,
    bottomLine: `Based on the activity described, there are compliance gaps that need to be addressed before proceeding. The most critical items involve ${frameworks[0]} requirements. None are necessarily blockers, but they require concrete compliance steps.`,
    nextSteps: [
      'Conduct a detailed data mapping exercise for the activity',
      'Implement required technical and organizational measures',
      'Update relevant policies and procedures',
      'Consider engaging specialized regulatory counsel for a formal compliance review',
      'Establish ongoing monitoring and audit processes',
    ],
    raw: 'Regulatory analysis - see structured results above.',
  }
}

function getFrameworkItems(framework) {
  const items = {
    'GDPR': [
      { text: 'Lawful basis for processing must be established', detail: 'Identify the appropriate lawful basis under Art. 6 GDPR (consent, legitimate interest, contract, etc.). Document the analysis.', severity: 'high' },
      { text: 'Data Protection Impact Assessment likely required', detail: 'Under Art. 35, a DPIA is required for processing "likely to result in a high risk." This activity appears to qualify.', severity: 'high' },
      { text: 'Data subject rights must be facilitated', detail: 'Ensure mechanisms exist for access, rectification, erasure, portability, and objection rights.', severity: 'medium' },
    ],
    'CCPA/CPRA': [
      { text: 'Consumer notice requirements apply', detail: 'Must provide notice at or before the point of collection describing categories of personal information collected and purposes.', severity: 'high' },
      { text: 'Opt-out mechanism may be required', detail: 'If personal information is "sold" or "shared" (broadly defined under CPRA), a "Do Not Sell/Share" mechanism is required.', severity: 'medium' },
      { text: 'Service provider agreements need CCPA provisions', detail: 'Contracts with service providers must include specific CCPA-required provisions limiting data use.', severity: 'medium' },
    ],
    'HIPAA': [
      { text: 'PHI identification and safeguards required', detail: 'If any data could constitute Protected Health Information, HIPAA Security Rule administrative, physical, and technical safeguards apply.', severity: 'high' },
      { text: 'Business Associate Agreement may be needed', detail: 'If sharing PHI with third parties, a BAA must be in place before any disclosure.', severity: 'high' },
      { text: 'Minimum necessary standard applies', detail: 'Limit PHI use and disclosure to the minimum necessary for the intended purpose.', severity: 'medium' },
    ],
  }

  return items[framework] || [
    { text: `${framework} compliance review required`, detail: `A detailed assessment against ${framework} requirements should be conducted. Key obligations and applicability thresholds should be mapped.`, severity: 'medium' },
    { text: 'Documentation and evidence of compliance needed', detail: `Maintain records demonstrating compliance with ${framework} requirements. This includes policies, procedures, and audit trails.`, severity: 'medium' },
    { text: 'Periodic review and monitoring recommended', detail: `Establish a cadence for reviewing ongoing compliance with ${framework} as regulations and business activities evolve.`, severity: 'low' },
  ]
}
