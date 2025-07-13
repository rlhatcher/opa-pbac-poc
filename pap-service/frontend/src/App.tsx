import { ThemeProvider } from './components/theme-provider'
import { ModernDashboard } from './components/ModernDashboard'

function App() {
  return (
    <ThemeProvider defaultTheme='dark' storageKey='pap-ui-theme'>
      <ModernDashboard />
    </ThemeProvider>
  )
}

export default App
