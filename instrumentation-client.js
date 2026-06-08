import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Filter benign noise: failed network fetches (offline / aborted navigation /
  // ad-blockers / connectivity blips), browser-extension errors, and the
  // harmless ResizeObserver warning. These aren't actionable bugs.
  ignoreErrors: [
    'Load failed',              // Safari/WebKit: a fetch() failed (network)
    'Failed to fetch',          // Chrome/Firefox: a fetch() failed (network)
    'NetworkError when attempting to fetch resource',
    'The network connection was lost',
    'cancelled', 'canceled',
    'AbortError',
    'TypeError: cancelled',
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    /extension\//i, 'top.GLOBALS',
  ],
  denyUrls: [
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
  ],

  beforeSend(event, hint) {
    const err = hint && hint.originalException;
    const msg = (err && err.message) || (event.exception?.values?.[0]?.value) || '';
    // Drop pure network-failure TypeErrors with no useful stack.
    if (/load failed|failed to fetch|networkerror|network connection was lost/i.test(msg)) return null;
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
