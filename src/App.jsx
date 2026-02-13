import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './screens/Home'
import ContractAnalyzer from './screens/ContractAnalyzer'
import RiskAssessor from './screens/RiskAssessor'
import IssueSpotter from './screens/IssueSpotter'
import RegulatoryChecker from './screens/RegulatoryChecker'
import AnalysisResult from './screens/AnalysisResult'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="contract" element={<ContractAnalyzer />} />
        <Route path="risk" element={<RiskAssessor />} />
        <Route path="issues" element={<IssueSpotter />} />
        <Route path="regulatory" element={<RegulatoryChecker />} />
        <Route path="result" element={<AnalysisResult />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
