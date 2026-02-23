#!/bin/bash
# Patch para Cloudflare Workers:
# Substituir cross-fetch E referências no hrana-client pelo fetch nativo
# cross-fetch usa node-fetch -> https.request (não disponível no Workers)

echo "🔧 Patching dependencies for Cloudflare Workers..."

# 1. Patch cross-fetch dist files
SHIM='var f=globalThis.fetch.bind(globalThis),R=globalThis.Request,H=globalThis.Headers,P=globalThis.Response;if(typeof module!=="undefined"&&module.exports){module.exports=f;module.exports.default=f;module.exports.fetch=f;module.exports.Headers=H;module.exports.Request=R;module.exports.Response=P}'

for file in $(find node_modules -path "*/cross-fetch/dist/cross-fetch.js" -type f 2>/dev/null); do
  echo "  📝 Patching: $file"
  echo "$SHIM" > "$file"
done

for file in $(find node_modules -path "*/cross-fetch/dist/browser-ponyfill.js" -type f 2>/dev/null); do
  echo "  📝 Patching: $file"
  echo "$SHIM" > "$file"
done

# 2. Patch @libsql/hrana-client para remover import de cross-fetch
# Isso garante que mesmo se cross-fetch não for patched, o fetch nativo é usado
for file in $(find node_modules -path "*/@libsql/hrana-client/lib-esm/http/client.js" -type f 2>/dev/null); do
  if grep -q 'from "cross-fetch"' "$file"; then
    echo "  📝 Patching hrana-client http/client.js"
    sed -i.bak 's|import { fetch, Request } from "cross-fetch";|const fetch = globalThis.fetch.bind(globalThis); const Request = globalThis.Request;|' "$file"
  fi
done

for file in $(find node_modules -path "*/@libsql/hrana-client/lib-esm/index.js" -type f 2>/dev/null); do
  if grep -q 'from "cross-fetch"' "$file"; then
    echo "  📝 Patching hrana-client index.js"
    sed -i.bak 's|export { fetch, Request, Headers } from "cross-fetch";|export const fetch = globalThis.fetch.bind(globalThis); export const Request = globalThis.Request; export const Headers = globalThis.Headers;|' "$file"
  fi
done

# 3. Patch node-fetch se existir (fallback)
for file in $(find node_modules -path "*/node-fetch/lib/index.mjs" -type f 2>/dev/null); do
  echo "  📝 Patching node-fetch"
  echo 'export default globalThis.fetch.bind(globalThis);export const Headers=globalThis.Headers;export const Request=globalThis.Request;export const Response=globalThis.Response;' > "$file"
done

echo "✅ All patches applied!"
