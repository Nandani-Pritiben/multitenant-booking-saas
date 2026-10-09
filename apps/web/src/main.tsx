import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './app/AuthProvider';
import { PhaseOneApp } from './app/PhaseOneApp';
import './styles/phase1.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <PhaseOneApp />
    </AuthProvider>
  </BrowserRouter>,
);