#!/bin/bash
set -e

echo "=== Building TerminusReact ==="
cd ../TerminusReact
npm install
npm run build

echo "=== Preparing Backend ==="
cd ../Terminus
mkdir -p public
rm -rf public/*
cp -r ../TerminusReact/dist/* public/

echo "=== Ready for Deployment ==="
ls -l public/
