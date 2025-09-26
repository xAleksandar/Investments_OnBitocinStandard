#!/bin/bash

# Basic test runner for Measure Everything in Bitcoin QA tests
# Runs a subset of critical smoke tests for quick validation

echo "🚀 Starting Basic QA Tests for Measure Everything in Bitcoin"
echo "=============================================="

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Server is not running on localhost:3000"
    echo "Please start the server with 'npm run dev' first"
    exit 1
fi

echo "✅ Server is running on localhost:3000"

# Run only critical smoke tests
echo "🧪 Running basic smoke tests..."
npx playwright test basic-smoke.spec.js --reporter=line

echo ""
echo "🔒 Running access control tests..."
npx playwright test access-control.spec.js --reporter=line

echo ""
echo "🎯 Running console error detection..."
npx playwright test console-errors.spec.js --reporter=line

echo ""
echo "🔄 Testing complete! Check results above."
echo "For full test suite, run: npm run test:e2e"
