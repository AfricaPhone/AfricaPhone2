const fs = require('fs');
const path = require('path');

const BUILD_ROOT = path.join(__dirname, '..', '.next');
const SSR_CHUNKS_DIR = path.join(BUILD_ROOT, 'server', 'chunks', 'ssr');
const RUNTIME_ORIGINAL = path.join(SSR_CHUNKS_DIR, '[turbopack]_runtime.js');
const RUNTIME_ORIGINAL_MAP = path.join(SSR_CHUNKS_DIR, '[turbopack]_runtime.js.map');
const RUNTIME_COPY = path.join(SSR_CHUNKS_DIR, 'turbopack_runtime.js');
const RUNTIME_COPY_MAP = path.join(SSR_CHUNKS_DIR, 'turbopack_runtime.js.map');
const DOCUMENT_PATH = path.join(BUILD_ROOT, 'server', 'pages', '_document.js');

function copyIfExists(source, destination) {
  if (!fs.existsSync(source)) {
    return false;
  }
  fs.copyFileSync(source, destination);
  return true;
}

function patchDocumentRuntime() {
  if (!fs.existsSync(DOCUMENT_PATH)) {
    return;
  }

  const content = fs.readFileSync(DOCUMENT_PATH, 'utf8');
  const patched = content.replace(
    '../chunks/ssr/[turbopack]_runtime.js',
    '../chunks/ssr/turbopack_runtime.js'
  );

  if (patched !== content) {
    fs.writeFileSync(DOCUMENT_PATH, patched, 'utf8');
  }
}

const runtimeCopied = copyIfExists(RUNTIME_ORIGINAL, RUNTIME_COPY);
const mapCopied = copyIfExists(RUNTIME_ORIGINAL_MAP, RUNTIME_COPY_MAP);

if (runtimeCopied) {
  patchDocumentRuntime();
} else {
  // eslint-disable-next-line no-console
  console.warn(
    '[postbuild-fix-turbopack] Runtime chunk not found. No changes were applied.'
  );
}

if (!mapCopied && fs.existsSync(RUNTIME_COPY) && fs.existsSync(RUNTIME_ORIGINAL_MAP)) {
  fs.copyFileSync(RUNTIME_ORIGINAL_MAP, RUNTIME_COPY_MAP);
}
