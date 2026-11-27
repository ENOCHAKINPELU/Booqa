import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import BusinessLandingPage from './pages/BusinessLandingPage';
import EnquiryPage from './pages/EnquiryPage';
import BusinessHomePage from './pages/business/BusinessHomePage';
import RequestsPage from './pages/business/RequestsPage';
import NewRequestPage from './pages/business/NewRequestPage';
import RequestPage from './pages/business/RequestPage';
import TeamPage from './pages/business/TeamPage';
import CompanyPage from './pages/business/CompanyPage';
import ReceiptPage from './pages/business/ReceiptPage';
import { PublicHotelsPage } from './pages/business/HotelsPage';
import { PublicHotelPage } from './pages/business/HotelPage';
import { OpsQueuePage, OpsRequestPage } from './pages/business/OpsPages';
import BizNav from './components/business/BizNav';
import BizFooter from './components/business/BizFooter';
import { AuthProvider } from './context/AuthContext';
import PaymentPage from './pages/PaymentPage';
import ConfirmationPage from './pages/ConfirmationPage';
import ManageBookingPage from './pages/ManageBookingPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import NotFoundPage from './pages/NotFoundPage';

/*
 * Booqa is business-only for now: organizations request and manage
 * accommodation through the workspace. The individual-guest booking site
 * (hotel search, hotel pages, guest checkout, guest account) is switched
 * off - its routes redirect home. Its code is kept (pages/LandingPage,
 * SearchPage, HotelDetailPage, BookingPage, account pages) so it can be
 * brought back by restoring the routes from git history.
 *
 * Still reachable, but not linked anywhere: payment, confirmation and
 * manage-booking, so anyone who already booked as an individual can finish
 * paying, view or cancel that booking.
 */

// Pages that render their own navigation and footer.
const OWN_LAYOUT = /^\/($|request-demo$|become-a-partner$|business(\/|$)|ops(\/|$))/;

// Retired individual-booking entry points.
const RETIRED = ['/hotels/:hotelId/book', '/search', '/account', '/account/bookings', '/account/bookings/:id', '/account/saved'];

function Shell() {
  const { pathname } = useLocation();
  const ownLayout = OWN_LAYOUT.test(pathname);
  const Wrapper = ownLayout ? 'div' : 'main'; // own-layout pages render their own <main>
  return (
    <div className="min-h-screen flex flex-col">
      {!ownLayout && <BizNav />}
      <Wrapper className="flex-1">
        <Routes>
          <Route path="/" element={<BusinessLandingPage />} />
          <Route path="/request-demo" element={<EnquiryPage kind="corporate" />} />
          <Route path="/become-a-partner" element={<EnquiryPage kind="partner" />} />
          <Route path="/business" element={<BusinessHomePage />} />
          <Route path="/business/requests" element={<RequestsPage />} />
          <Route path="/business/requests/new" element={<NewRequestPage />} />
          <Route path="/business/requests/:id" element={<RequestPage />} />
          <Route path="/business/requests/:id/receipt" element={<ReceiptPage />} />
          <Route path="/business/team" element={<TeamPage />} />
          <Route path="/business/company" element={<CompanyPage />} />
          {/* Hotels live on the public pages only (they work signed in too) */}
          <Route path="/business/hotels/*" element={<ToPublicHotels />} />
          <Route path="/ops" element={<OpsQueuePage />} />
          <Route path="/ops/requests/:id" element={<OpsRequestPage />} />

          {/* Public: anyone can browse hotels; booking asks for sign-in */}
          <Route path="/hotels" element={<PublicHotelsPage />} />
          <Route path="/hotels/:id" element={<PublicHotelPage />} />

          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Existing individual bookings only - see note above */}
          <Route path="/reservations/:id/pay" element={<PaymentPage />} />
          <Route path="/reservations/:id/confirmation" element={<ConfirmationPage />} />
          <Route path="/manage" element={<ManageBookingPage />} />

          {RETIRED.map((p) => <Route key={p} path={p} element={<Navigate to="/" replace />} />)}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Wrapper>
      {!ownLayout && <BizFooter />}
    </div>
  );
}

// Old workspace hotel links -> the same page under /hotels, keeping the search.
function ToPublicHotels() {
  const { pathname, search } = useLocation();
  return <Navigate to={pathname.replace(/^\/business/, '') + search} replace />;
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
