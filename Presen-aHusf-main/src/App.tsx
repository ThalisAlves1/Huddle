import {
  lazy,
  Suspense,
} from 'react'

import {
  Route,
  Routes,
} from 'react-router'

import {
  ProtectedRoute,
} from './components/ProtectedRoute'

import './App.css'
import './styles/scanner-ui.css'

const LoginPage = lazy(() =>
  import('./pages/LoginPage').then(module => ({ default: module.LoginPage })))
const CadastroPage = lazy(() =>
  import('./pages/CadastroPage').then(module => ({ default: module.CadastroPage })))
const EntryPage = lazy(() =>
  import('./pages/EntryPage').then(module => ({ default: module.EntryPage })))
const HomePage = lazy(() =>
  import('./pages/HomePage').then(module => ({ default: module.HomePage })))
const LeaderPage = lazy(() =>
  import('./pages/LeaderPage').then(module => ({ default: module.LeaderPage })))
const ScannerPage = lazy(() =>
  import('./pages/ScannerPage').then(module => ({ default: module.ScannerPage })))
const ConfirmarPresencaPage = lazy(() =>
  import('./pages/ConfirmarPresencaPage').then(module => ({ default: module.ConfirmarPresencaPage })))
const PresencaConfirmadaPage = lazy(() =>
  import('./pages/PresencaConfirmadaPage').then(module => ({ default: module.PresencaConfirmadaPage })))
const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then(module => ({ default: module.HistoryPage })))
const EvidencePage = lazy(() =>
  import('./pages/EvidencePage').then(module => ({ default: module.EvidencePage })))
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then(module => ({ default: module.AdminPage })))

function App() {

  return (

    <Suspense fallback={<div>Carregando...</div>}>
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
    </Suspense>

  )

}

export default App
