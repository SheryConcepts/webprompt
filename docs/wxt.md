
WXT aims to develop cross browser extension with great developer experience.

We develop extensions in typescript/javascript with frontend framework of choice or vanila js

/fetch https://wxt.dev/
/fetch https://wxt.dev/guide/introduction.html
/fetch https://wxt.dev/guide/installation.html

# Guide 

### Project Structure
It follows a opinionated file structure.
/fetch https://wxt.dev/guide/essentials/project-structure.html

### Entry Points 
WXT uses `<pwd>/entrypoints/*` files as entrypoints to build the extension output code.
The `manifest.json` config is not defined separately, but are included inside the `entrpoint` file. See the below link to understand different types of entry-points, along with their syntax and semantics. 
/fetch https://wxt.dev/guide/essentials/entrypoints.html

### Configuration
WXT is highly configurable and customizable, read the customization section of the documentation to understand all aspects of it.
/fetch https://wxt.dev/guide/essentials/config/manifest.html
/fetch https://wxt.dev/guide/essentials/config/browser-startup.html
/fetch https://wxt.dev/guide/essentials/config/auto-imports
/fetch https://wxt.dev/guide/essentials/config/environment-variables
/fetch https://wxt.dev/guide/essentials/config/runtime
/fetch https://wxt.dev/guide/essentials/config/vite
/fetch https://wxt.dev/guide/essentials/config/build-mode
/fetch https://wxt.dev/guide/essentials/config/typescript
/fetch https://wxt.dev/guide/essentials/config/hooks
/fetch https://wxt.dev/guide/essentials/config/entrypoint-loaders

### Extension APIs
WXT provides a unified API under the `browser` namespace for both chrome and firefox.
/fetch https://wxt.dev/guide/essentials/extension-apis.html

### Assets
Assets can be in `public` directory and in `assets` public directory assets are directly placed in the output extension while assets are accessed through relative imports in the codebase.
/fetch https://wxt.dev/guide/essentials/assets.html

### Target Different Browser
WXT allows us to target different browsers. See below links for detailed information.
/fetch https://wxt.dev/guide/essentials/target-different-browsers.html

### Content Scripts
WXT allows many tools to deal with the nuances of `Content Scripts` read the below page to understand.
/fetch https://wxt.dev/guide/essentials/content-scripts.html

### Storage
Storage can be accessed through the normal browser storage APIs or we can use wrapper APIs provide  d by the WXT.
/fetch https://wxt.dev/guide/essentials/storage.html

### Messaging 
Messaging can be done using the vanila APIs but popular libraries can be used as well.
/fetch https://wxt.dev/guide/essentials/messaging.html

### WXT Modules
It allows us to run code at different steps of the build process.
/fetch https://wxt.dev/guide/essentials/wxt-modules.html

### Frontend Frameworks
WXT has module for different frameworks. Add that frameworks module and use that framework for UIs.
/fetch https://wxt.dev/guide/essentials/frontend-frameworks.html

### Other Guides
/fetch https://wxt.dev/guide/essentials/i18n.html
/fetch https://wxt.dev/guide/essentials/es-modules.html
/fetch https://wxt.dev/guide/essentials/remote-code.html
/fetch https://wxt.dev/guide/essentials/unit-testing.html
/fetch https://wxt.dev/guide/essentials/e2e-testing.html
/fetch https://wxt.dev/guide/essentials/publishing.html
