/**
 * ANYCS Vector Icons System
 * Integrates Lucide icons for crisp, modern vector icons across public site and admin portal.
 */

(function (global) {
  'use strict';

  function toPascalCase(string) {
    if (!string) return '';
    const camelCase = string.replace(/-([a-z0-9])/g, function (_, char) {
      return char.toUpperCase();
    });
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  }

  function getIconSvg(name, options) {
    var opts = options || {};
    var size = opts.size || 18;
    var className = opts.className || opts.class || '';
    var strokeWidth = opts.strokeWidth || 2;

    var luc = global.lucide;
    if (!luc || !luc.icons) {
      return '<i data-lucide="' + name + '" class="' + className + '"></i>';
    }

    var pascalName = toPascalCase(name);
    var iconDef = luc.icons[pascalName] || luc.icons[name];
    if (!iconDef) {
      return '<i data-lucide="' + name + '" class="' + className + '"></i>';
    }

    var children = iconDef.map(function (item) {
      var tag = item[0];
      var attrs = item[1];
      var attrStr = Object.keys(attrs).map(function (k) {
        return k + '="' + attrs[k] + '"';
      }).join(' ');
      return '<' + tag + ' ' + attrStr + '></' + tag + '>';
    }).join('');

    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + strokeWidth + '" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-' + name + ' ' + className + '">' + children + '</svg>';
  }

  function refreshIcons(root) {
    if (global.lucide && typeof global.lucide.createIcons === 'function') {
      try {
        global.lucide.createIcons(root ? { root: root } : undefined);
      } catch (err) {
        console.warn('Lucide icon rendering error:', err);
      }
    }
  }

  // Expose to window / global
  global.getIconSvg = getIconSvg;
  global.refreshIcons = refreshIcons;

  // Auto-init on DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        refreshIcons();
      });
    } else {
      setTimeout(function () {
        refreshIcons();
      }, 0);
    }
  }
})(typeof window !== 'undefined' ? window : this);
