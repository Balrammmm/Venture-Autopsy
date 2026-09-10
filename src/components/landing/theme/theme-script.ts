export const THEME_KEY = 'va.theme'

/**
 * Runs before first paint so the stored theme is on <html> before any pixel is
 * drawn. Plain module (no 'use client') so the server layout can import it
 * without pulling a client component into the RSC graph.
 */
export const themeScript = `(function(){try{var k='${THEME_KEY}';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})()`
