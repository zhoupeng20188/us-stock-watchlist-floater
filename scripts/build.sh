#!/bin/bash
# Build two release zips: edge (MV3 service_worker only) and firefox (adds background.scripts + gecko id)
set -e
cd "$(dirname "$0")/.."

VERSION=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
FILES="background.js content.js content.css popup.html popup.css popup.js icons"

mkdir -p dist
rm -rf dist/build
mkdir -p dist/build/edge dist/build/firefox

for variant in edge firefox; do
  cp -r $FILES dist/build/$variant/
done

# Edge/Chrome: strip background.scripts and gecko settings
python3 - <<'EOF'
import json
m = json.load(open('manifest.json'))
m['background'] = {'service_worker': 'background.js'}
m.pop('browser_specific_settings', None)
json.dump(m, open('dist/build/edge/manifest.json', 'w'), indent=2)
EOF

# Firefox: keep manifest as-is (scripts + gecko id)
cp manifest.json dist/build/firefox/manifest.json

(cd dist/build/edge && zip -qr "../../us-stock-watchlist-floater-$VERSION-edge.zip" .)
(cd dist/build/firefox && zip -qr "../../us-stock-watchlist-floater-$VERSION-firefox.zip" .)

rm -rf dist/build
ls -lh dist/*.zip
