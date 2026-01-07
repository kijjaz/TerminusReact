#!/bin/bash
set -e

echo "=== Building TerminusReact (Root Workflow) ==="
cd TerminusReact
npm install
npm run build
cd ..

echo "=== Updating Root Public Assets ==="
mkdir -p public
rm -rf public/*
cp -r TerminusReact/dist/* public/

echo "=== Ready for Deployment ==="
