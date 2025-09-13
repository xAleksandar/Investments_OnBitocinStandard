#!/usr/bin/env node

/**
 * Test to verify the performance calculation bug and its fix
 * This test simulates the frontend displayPortfolio function behavior
 */

const assert = require('assert');

// Colors for console output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log(`${YELLOW}=== Performance Calculation Bug Test ===${RESET}\n`);

// Simulate DOM elements
class MockElement {
    constructor(id) {
        this.id = id;
        this.textContent = '';
        this.className = '';
        this.parentElement = {
            className: ''
        };
    }
}

// Mock DOM
const mockDOM = {
    holdings: new MockElement('holdings'),
    totalValue: new MockElement('totalValue'),
    performance: new MockElement('performance')
};

// Mock getElementById
function getElementById(id) {
    return mockDOM[id] || null;
}

// ORIGINAL BUGGY VERSION (current implementation)
function displayPortfolio_BUGGY(data) {
    const holdingsDiv = getElementById('holdings');
    const totalValueDiv = getElementById('totalValue');

    const totalSats = data.total_value_sats || 0;
    const totalBTC = (totalSats / 100000000).toFixed(8);
    totalValueDiv.textContent = `${totalBTC} BTC`;

    // BUG: Performance element is never updated!
    // The performance display remains at its default "0%"

    holdingsDiv.innerHTML = ''; // Simplified - we don't need full holdings display for this test
}

// FIXED VERSION
function displayPortfolio_FIXED(data) {
    const holdingsDiv = getElementById('holdings');
    const totalValueDiv = getElementById('totalValue');
    const performanceDiv = getElementById('performance');  // NOW WE GET IT!

    const totalSats = data.total_value_sats || 0;
    const totalBTC = (totalSats / 100000000).toFixed(8);
    totalValueDiv.textContent = `${totalBTC} BTC`;

    // FIX: Calculate and display performance
    const startingBalance = 100000000; // 1 BTC in sats
    const totalCostBasis = data.total_cost_sats || startingBalance;
    const currentValue = data.total_value_sats || 0;

    // Calculate performance percentage
    const performanceValue = ((currentValue - totalCostBasis) / totalCostBasis) * 100;
    const isPositive = performanceValue >= 0;

    // Update performance display
    performanceDiv.textContent = `${isPositive ? '+' : ''}${performanceValue.toFixed(2)}%`;

    // Update color based on performance
    const parentDiv = performanceDiv.parentElement;
    if (isPositive) {
        parentDiv.className = 'bg-green-50 p-4 rounded';
        performanceDiv.className = 'text-2xl font-bold text-green-600';
    } else {
        parentDiv.className = 'bg-red-50 p-4 rounded';
        performanceDiv.className = 'text-2xl font-bold text-red-600';
    }

    holdingsDiv.innerHTML = ''; // Simplified
}

// Test Cases
const testCases = [
    {
        name: "User lost 0.01% (as reported by creator)",
        data: {
            total_value_sats: 99990000,  // 0.9999 BTC
            total_cost_sats: 100000000,  // 1.0 BTC starting
            btc_price: 45000
        },
        expectedPerformance: "-0.01%",
        expectedColor: "red"
    },
    {
        name: "User gained 10%",
        data: {
            total_value_sats: 110000000,  // 1.1 BTC
            total_cost_sats: 100000000,   // 1.0 BTC starting
            btc_price: 45000
        },
        expectedPerformance: "+10.00%",
        expectedColor: "green"
    },
    {
        name: "User at breakeven",
        data: {
            total_value_sats: 100000000,  // 1.0 BTC
            total_cost_sats: 100000000,   // 1.0 BTC starting
            btc_price: 45000
        },
        expectedPerformance: "+0.00%",
        expectedColor: "green"
    },
    {
        name: "User lost 25%",
        data: {
            total_value_sats: 75000000,   // 0.75 BTC
            total_cost_sats: 100000000,   // 1.0 BTC starting
            btc_price: 45000
        },
        expectedPerformance: "-25.00%",
        expectedColor: "red"
    }
];

// Run tests
console.log(`${RED}--- Testing BUGGY version (current implementation) ---${RESET}`);
let buggyFailures = 0;

testCases.forEach(test => {
    // Reset mock DOM
    mockDOM.performance.textContent = '0%'; // Default value in HTML

    // Run buggy version
    displayPortfolio_BUGGY(test.data);

    const actualPerformance = mockDOM.performance.textContent;
    const passed = actualPerformance === test.expectedPerformance;

    if (!passed) {
        buggyFailures++;
        console.log(`${RED} FAIL${RESET}: ${test.name}`);
        console.log(`  Expected: "${test.expectedPerformance}"`);
        console.log(`  Actual:   "${actualPerformance}" (stuck at default)`);
    } else {
        console.log(`${GREEN} PASS${RESET}: ${test.name}`);
    }
});

console.log(`\nBuggy version: ${RED}${buggyFailures}/${testCases.length} tests failed${RESET}`);
console.log("This confirms the bug - performance is never calculated!\n");

// Now test the fix
console.log(`${GREEN}--- Testing FIXED version ---${RESET}`);
let fixedFailures = 0;

testCases.forEach(test => {
    // Reset mock DOM
    mockDOM.performance.textContent = '0%';
    mockDOM.performance.className = '';
    mockDOM.performance.parentElement.className = '';

    // Run fixed version
    displayPortfolio_FIXED(test.data);

    const actualPerformance = mockDOM.performance.textContent;
    const actualColorClass = mockDOM.performance.className;
    const passed = actualPerformance === test.expectedPerformance;
    const colorCorrect = actualColorClass.includes(test.expectedColor);

    if (!passed || !colorCorrect) {
        fixedFailures++;
        console.log(`${RED} FAIL${RESET}: ${test.name}`);
        if (!passed) {
            console.log(`  Performance - Expected: "${test.expectedPerformance}", Actual: "${actualPerformance}"`);
        }
        if (!colorCorrect) {
            console.log(`  Color - Expected: "${test.expectedColor}", Actual class: "${actualColorClass}"`);
        }
    } else {
        console.log(`${GREEN} PASS${RESET}: ${test.name}`);
        console.log(`  Performance: ${actualPerformance} with ${test.expectedColor} color`);
    }
});

console.log(`\nFixed version: ${fixedFailures === 0 ? GREEN : RED}${testCases.length - fixedFailures}/${testCases.length} tests passed${RESET}`);

// Summary
console.log(`\n${YELLOW}=== Test Summary ===${RESET}`);
if (buggyFailures === testCases.length && fixedFailures === 0) {
    console.log(`${GREEN} Test confirms the bug exists and the fix works!${RESET}`);
    console.log(`   - Buggy version fails all ${testCases.length} tests (performance stuck at 0%)`);
    console.log(`   - Fixed version passes all ${testCases.length} tests`);
    process.exit(0);
} else if (buggyFailures === 0) {
    console.log(`${YELLOW}   Warning: Bug might already be fixed or test is incorrect${RESET}`);
    process.exit(1);
} else {
    console.log(`${RED}L Fix is not working correctly${RESET}`);
    process.exit(1);
}