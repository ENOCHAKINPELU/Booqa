import React from 'react';
import LegalPage from '../components/LegalPage';

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 2026">
      <p>
        Booqa is in early access — a formal Privacy Policy will be published before public
        launch. Until then, here's a plain-language summary of what actually happens with
        your information today, kept honest rather than filled in with boilerplate.
      </p>
      <p>
        <b>What's collected:</b> your name, email, and phone number when you create an
        account or make a booking, and the dates/room details of the booking itself. That
        information is shared with the specific hotel you book, through HotelOps, so they
        can prepare for your stay — it isn't sold or shared with anyone else.
      </p>
      <p>
        <b>Payments:</b> handled entirely by Flutterwave. Booqa's own systems never see or
        store your card number.
      </p>
      <p>
        <b>Your account:</b> you can request a booking without creating an account at all —
        an account just lets you see past and upcoming bookings in one place (My bookings).
        Signing out clears your session; there's no account-deletion flow yet, which is a
        real gap this early-access period is meant to surface before public launch.
      </p>
    </LegalPage>
  );
}
