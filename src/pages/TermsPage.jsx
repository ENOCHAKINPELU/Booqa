import React from 'react';
import LegalPage from '../components/LegalPage';

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="August 2026">
      <p>
        Booqa is in early access, currently serving hotels in Port Harcourt, Rivers State.
        A formal Terms of Service will be published before public launch — this page exists
        so nothing in the app links to a dead page in the meantime, and to set expectations
        plainly while that document is being finalized.
      </p>
      <p>
        In plain terms: Booqa connects you directly with independent hotels. Each hotel sets
        its own room rates, availability, and cancellation terms, shown to you before you
        confirm a booking. Booqa passes your reservation details to the hotel through its own
        systems so they can prepare for your stay — it does not operate the hotel, and is not
        the merchant of record for your room.
      </p>
      <p>
        Payments are processed by Flutterwave. Booqa does not receive or store your card
        details.
      </p>
      <p>
        Because this is an early-access product, features and these terms may change as
        Booqa develops. If something here matters to a booking you're about to make, the
        safest source of truth is always the specific hotel and rate details shown at
        checkout.
      </p>
    </LegalPage>
  );
}
