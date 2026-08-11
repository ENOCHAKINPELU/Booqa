import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PartnerAuthProvider } from './context/PartnerAuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import SearchPage from './pages/SearchPage';
import HotelDetailPage from './pages/HotelDetailPage';
import BookingPage from './pages/BookingPage';
import PaymentPage from './pages/PaymentPage';
import ConfirmationPage from './pages/ConfirmationPage';
import ManageBookingPage from './pages/ManageBookingPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import BookingsListPage from './pages/BookingsListPage';
import SavedHotelsPage from './pages/SavedHotelsPage';
import BookingDetailPage from './pages/BookingDetailPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import NotFoundPage from './pages/NotFoundPage';
import PartnerLayout from './components/partner/PartnerLayout';
import PartnerLoginPage from './pages/partner/PartnerLoginPage';
import PartnerApplyPage from './pages/partner/PartnerApplyPage';
import PartnerDashboardPage from './pages/partner/PartnerDashboardPage';
import PartnerProfilePage from './pages/partner/PartnerProfilePage';
import PartnerSettlementsPage from './pages/partner/PartnerSettlementsPage';

export default function App() {
  return (
    <AuthProvider>
      {/* Independent of AuthProvider — a hotel partner's session and a
          guest session are unrelated identities that can coexist in the
          same browser (see context/PartnerAuthContext.jsx). */}
      <PartnerAuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/hotels/:hotelId" element={<HotelDetailPage />} />
                <Route path="/hotels/:hotelId/book" element={<BookingPage />} />
                <Route path="/reservations/:id/pay" element={<PaymentPage />} />
                <Route path="/reservations/:id/confirmation" element={<ConfirmationPage />} />
                <Route path="/manage" element={<ManageBookingPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/account" element={<DashboardPage />} />
                <Route path="/account/bookings" element={<BookingsListPage />} />
                <Route path="/account/bookings/:id" element={<BookingDetailPage />} />
                <Route path="/account/saved" element={<SavedHotelsPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />

                {/* Hotel partner area (Phase 4) — federated login against
                    HotelOps, everything below /partner requires it. */}
                <Route path="/partner/login" element={<PartnerLoginPage />} />
                <Route path="/partner" element={<PartnerLayout />}>
                  <Route path="dashboard" element={<PartnerDashboardPage />} />
                  <Route path="application" element={<PartnerApplyPage />} />
                  <Route path="profile" element={<PartnerProfilePage />} />
                  <Route path="settlements" element={<PartnerSettlementsPage />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </PartnerAuthProvider>
    </AuthProvider>
  );
}
