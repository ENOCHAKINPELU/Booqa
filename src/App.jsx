import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import BusinessLandingPage from './pages/BusinessLandingPage';
import EnquiryPage from './pages/EnquiryPage';
import { AuthProvider } from './context/AuthContext';
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

// The corporate site ("/", "/request-demo", "/become-a-partner") has its
// own navigation and footer; everything else is the guest booking site
// with the original Header/Footer.
const CORPORATE_PATHS = ['/', '/request-demo', '/become-a-partner'];

function Shell() {
  const { pathname } = useLocation();
  const corporate = CORPORATE_PATHS.includes(pathname);
  // Corporate pages render their own <main>; avoid nesting two.
  const Wrapper = corporate ? 'div' : 'main';
  return (
    <div className="min-h-screen flex flex-col">
      {!corporate && <Header />}
      <Wrapper className="flex-1">
        <Routes>
          <Route path="/" element={<BusinessLandingPage />} />
          <Route path="/request-demo" element={<EnquiryPage kind="corporate" />} />
          <Route path="/become-a-partner" element={<EnquiryPage kind="partner" />} />
          <Route path="/hotels" element={<LandingPage />} />
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
              <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Wrapper>
      {!corporate && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  );
}
