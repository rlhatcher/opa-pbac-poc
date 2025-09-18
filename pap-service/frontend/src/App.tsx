import { ThemeProvider } from './components/theme-provider'
import { Dashboard } from './components/Dashboard'

function App() {
  return (
    <ThemeProvider defaultTheme='dark' storageKey='pap-ui-theme'>
      <div className='min-h-screen bg-background text-foreground'>
        <Dashboard />
      </div>
    </ThemeProvider>
  )
}

export default App
