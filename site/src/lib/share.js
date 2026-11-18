// Shares a page: native share sheet on phones (WhatsApp etc.), copy-to-clipboard elsewhere.
// Returns "shared", "copied" or "cancelled".
export async function sharePage({ title, text, url = location.href }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    window.prompt('Copie o link:', url);
  }
  return 'copied';
}
