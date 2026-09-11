import {
  Route,
  Routes,
} from 'react-router'

import {
  LoginPage,
} from './pages/LoginPage'

import {
  CadastroPage,
} from './pages/CadastroPage'

import {
  EntryPage,
} from './pages/EntryPage'

import {
  HomePage,
} from './pages/HomePage'

import {
  LeaderPage,
} from './pages/LeaderPage'

import {
  ScannerPage,
} from './pages/ScannerPage'

import {
  ConfirmarPresencaPage,
} from './pages/ConfirmarPresencaPage'

import {
  PresencaConfirmadaPage,
} from './pages/PresencaConfirmadaPage'

import {
  HistoryPage,
} from './pages/HistoryPage'

import {
  EvidencePage,
} from './pages/EvidencePage'

import {
  ProtectedRoute,
} from './components/ProtectedRoute'

import {
  AdminPage,
} from './pages/AdminPage'

import './App.css'
import './styles/scanner-ui.css'

function App() {

  return (

    <Routes>

<Route
  path="/admin"
  element={
    <ProtectedRoute>
      <AdminPage />
    </ProtectedRoute>
  }
/>

      <Route
        path="/login"
        element={
          <LoginPage />
        }
      />

      <Route
        path="/cadastro"
        element={
          <CadastroPage />
        }
      />


      <Route
        path="/"
        element={
          <ProtectedRoute>

            <EntryPage />

          </ProtectedRoute>
        }
      />


      <Route
        path="/colaborador"
        element={
          <ProtectedRoute>

            <HomePage />

          </ProtectedRoute>
        }
      />


      <Route
        path="/lider"
        element={
          <ProtectedRoute>

            <LeaderPage />

          </ProtectedRoute>
        }
      />


      <Route
        path="/lider/historico"
        element={
          <ProtectedRoute>

            <HistoryPage />

          </ProtectedRoute>
        }
      />


      <Route
        path="/lider/historico/:huddleId"
        element={
          <ProtectedRoute>

            <EvidencePage />

          </ProtectedRoute>
        }
      />


      <Route
        path="/scanner"
        element={
          <ProtectedRoute>

            <ScannerPage />

          </ProtectedRoute>
        }
      />


      <Route
        path="/confirmar-presenca"
        element={
          <ProtectedRoute>

            <ConfirmarPresencaPage />

          </ProtectedRoute>
        }
      />


      <Route
        path="/presenca-confirmada"
        element={
          <ProtectedRoute>

            <PresencaConfirmadaPage />

          </ProtectedRoute>
        }
      />


    </Routes>

  )

}

export default App