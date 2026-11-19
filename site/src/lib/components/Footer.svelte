<script>
  // Links to the parent site (project page and privacy policy). Plain <a href> so crawlers follow them.
  import { t, PARENT_SITE } from '$lib/strings.js';
</script>

<footer class="footer">
  <nav aria-label="Rodapé">
    <a href="{PARENT_SITE}/biblia/">{t.footerAbout}</a>
    <span aria-hidden="true">·</span>
    <a href="{PARENT_SITE}/privacidade/">{t.footerPrivacy}</a>
  </nav>
  <p><a href="{PARENT_SITE}/">{t.footerBy}</a></p>
</footer>

<style>
  .footer { max-width: 560px; margin: 0 auto; padding: 8px 20px calc(28px + var(--player-h) + env(safe-area-inset-bottom)); text-align: center; font-size: 13px; color: var(--muted); }
  nav { display: flex; justify-content: center; gap: 10px; }
  a { color: var(--rose); }
  p { margin: 8px 0 0; font-size: 12px; }
  p a { color: var(--muted); letter-spacing: .08em; }
</style>
