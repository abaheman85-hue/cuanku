import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { FeedbackProvider } from './context/Feedback';
import { BerandaPage } from './pages/BerandaPage';
import { PengaturanPage } from './pages/PengaturanPage';
import { TransaksiPage } from './pages/TransaksiPage';
import { WishlistPage } from './pages/WishlistPage';

export function App() {
  return (
    <FeedbackProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<BerandaPage />} />
            <Route path="/transaksi" element={<TransaksiPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/pengaturan" element={<PengaturanPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </FeedbackProvider>
  );
}
