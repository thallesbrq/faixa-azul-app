import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
// A identidade da marca vem do core, a mesma que o app do aluno usa.
import '@faixa-azul/core/tokens.css'
import './ui/central.css'

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Elemento #root nao encontrado no index.html')

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
