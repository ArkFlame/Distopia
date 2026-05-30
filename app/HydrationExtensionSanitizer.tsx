import Script from 'next/script';

const sanitizerScript = String.raw`
(function () {
  var ATTRIBUTES = [
    'nighteye',
    'cz-shortcut-listen',
    'data-new-gr-c-s-check-loaded',
    'data-gr-ext-installed',
    'data-lt-installed',
    'data-lt-tmp-id',
    'spellcheck',
    'data-gramm',
    'data-gramm_editor',
    'data-enable-grammarly'
  ];
  function shouldDebug() {
    try {
      return window.localStorage && window.localStorage.getItem('distopia:debugHydration') === '1';
    } catch (_) {
      return false;
    }
  }
  function cleanElement(element) {
    if (!element || !element.getAttribute) return 0;
    var removed = 0;
    for (var i = 0; i < ATTRIBUTES.length; i += 1) {
      var attribute = ATTRIBUTES[i];
      if (element.hasAttribute(attribute)) {
        element.removeAttribute(attribute);
        removed += 1;
      }
    }
    return removed;
  }
  function clean(reason) {
    var removed = cleanElement(document.documentElement) + cleanElement(document.body);
    if (removed > 0 && shouldDebug()) {
      console.info('[Distopia hydration] removed extension-injected attributes', { reason: reason, removed: removed });
    }
  }
  clean('beforeInteractive');
  try {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i += 1) {
        var mutation = mutations[i];
        if (mutation.type === 'attributes') clean('mutation:' + mutation.attributeName);
      }
    });
    observer.observe(document.documentElement, { attributes: true });
    if (document.body) observer.observe(document.body, { attributes: true });
    window.__distopiaHydrationSanitizer = { clean: clean };
  } catch (_) {
    clean('observer-fallback');
  }
})();
`;

export default function HydrationExtensionSanitizer() {
  return <Script id="distopia-hydration-extension-sanitizer" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: sanitizerScript }} />;
}
