'use client';

/** Available even after consent withdrawal. The server checks owner handover first. */
export async function deleteAccount() {
  const typed = window.prompt('This permanently deletes your account, every child profile, log and decode, and cancels any subscription. Type DELETE to confirm.');
  if (typed?.trim().toUpperCase() !== 'DELETE') return;
  try {
    const response = await fetch('/api/account/delete', { method: 'POST' });
    if (response.ok) { window.location.assign('/'); return; }
    const body = await response.json().catch(() => null);
    window.alert(body?.error ?? 'We could not delete your account. Please try again.');
  } catch { window.alert('We could not reach Kahiye. Please try again.'); }
}
