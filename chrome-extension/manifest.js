import fs from 'node:fs';
import deepmerge from 'deepmerge';

const packageJson = JSON.parse(fs.readFileSync('../package.json', 'utf8'));

const isFirefox = process.env.__FIREFOX__ === 'true';

const sidePanelConfig = {
  side_panel: {
    default_path: 'side-panel/index.html',
  },
  permissions: ['sidePanel'],
};

/**
 * After changing, please reload the extension at `chrome://extensions`
 * @type {chrome.runtime.ManifestV3}
 */
const manifest = deepmerge(
  {
    manifest_version: 3,
    default_locale: 'en',
    /**
     * if you want to support multiple languages, you can use the following reference
     * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
     */
    name: '6dv Extension',
    version: packageJson.version,
    description: '6dv extension description',
    host_permissions: ['*://www.youtube.com/*'],
    permissions: ['storage', 'scripting', 'tabs', 'notifications', 'contextMenus', 'activeTab'],
    options_page: 'options/index.html',
    background: {
      service_worker: 'background.iife.js',
      type: 'module',
    },
    action: {
      default_popup: 'popup/index.html',
      default_icon: 'pizza_logo.png',
    },
    icons: {
      128: 'pizza_logo.png',
    },
    content_scripts: [
      {
        matches: ['https://www.youtube.com/*', 'http://www.youtube.com/*'],
        js: ['content/index.iife.js'],
      },
      {
        matches: ['https://www.youtube.com/*', 'http://www.youtube.com/*'],
        js: ['content-ui/index.iife.js'],
      },
      {
        matches: ['https://www.youtube.com/*', 'http://www.youtube.com/*'],
        css: ['content.css'], // public folder
      },
    ],
    devtools_page: 'devtools/index.html',
    web_accessible_resources: [
      {
        resources: [
          '*.js',
          '*.css',
          '*.svg',
          'icon-128.png',
          'icon-34.png',
          'content-ui/loading-animation.json',
          'pizza_logo.png',
        ],
        matches: ['*://*/*'],
      },
    ],
  },
  !isFirefox && sidePanelConfig,
);

export default manifest;
