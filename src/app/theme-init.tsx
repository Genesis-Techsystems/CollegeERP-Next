"use client";

import { useServerInsertedHTML } from "next/navigation";

/** Applies saved colour theme + dark mode before first paint (no flash). Injected via useServerInsertedHTML so React 19 never sees a <script> in the component tree. */
const THEME_INIT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem('erp_theme_settings')||'{}');var t=s.colorScheme||'university-blue';document.documentElement.setAttribute('data-theme',t);var m=s.themeMode||'light';if(m==='system'){m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(m==='dark'){document.documentElement.classList.add('dark');}}catch(e){document.documentElement.setAttribute('data-theme','university-blue');}})();`;

export function ThemeInit() {
  useServerInsertedHTML(() => (
    <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
  ));

  return null;
}
