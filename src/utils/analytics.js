// Provider-agnostic event tracking. No analytics provider (GA/PostHog/
// Mixpanel/Segment) is actually configured anywhere in this codebase yet —
// rather than wire up a specific one nobody asked for, or fabricate one
// that silently does nothing, every call point in the app already fires
// through this single function. Swapping in a real provider later is a
// one-function-body change here, not a hunt through every page that
// wants to track something.
//
// Event names match the Phase 2 spec's list exactly (search_started,
// hotel_viewed, booking_confirmed, etc.) so wiring a real provider in
// later doesn't also mean renaming events across the app.
const DEBUG = import.meta.env.DEV;

export function track(event, properties = {}) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event, properties);
  }
  // Intentionally a no-op beyond logging until a real provider is wired
  // up — see the file header. window.dataLayer/gtag or a provider SDK
  // call would go here, guarded the same way every other integration in
  // this app checks for its own configuration before using it.
}
