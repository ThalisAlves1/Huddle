import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import App from './App'

import {
  AuthProvider,
} from './contexts/AuthContext'

import {
  SiteFooter,
} from './components/SiteFooter'

import './index.css'
import './styles/responsive.css'
import './styles/login-organized.css'
import './styles/footer.css'

const rootElement =
  document.getElementById('root')

if (!rootElement) {
  throw new Error(
    'Elemento root não encontrado.'
  )
}

createRoot(
  rootElement
).render(
  <BrowserRouter>
    <AuthProvider>

      <div className="app-shell">

        <div className="app-content">
          <App />
        </div>

        <SiteFooter />

      </div>

    </AuthProvider>
  </BrowserRouter>
)