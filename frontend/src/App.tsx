import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import Candidates from './pages/Candidates'
import Compare from './pages/Compare'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import Matching from './pages/Matching'
import AIIntelligence from './pages/AIIntelligence'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="candidates" element={<Candidates />} />
        <Route path="matching" element={<Matching />} />
        <Route path="ai" element={<AIIntelligence />} />
        <Route path="compare" element={<Compare />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
