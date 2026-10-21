#!/usr/bin/env bash
# Render Build Script for Backend
# This script runs during the build phase on Render

set -o errexit  # Exit on error

echo "=== Installing Python dependencies ==="
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "=== Ensuring database directory exists ==="
mkdir -p database

echo "=== Build complete ==="
