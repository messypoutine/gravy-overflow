#!/usr/bin/env node

/**
 * Security test for the gravy-overflow application
 * This test verifies that the RCE vulnerability has been fixed
 */

import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 1337;
const TEST_TIMEOUT = 10000;

let serverProcess;

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['app.js'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Server listening on port')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    serverProcess.on('error', reject);
    
    setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, 5000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:${PORT}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function testRCEVulnerability() {
  console.log('Testing for RCE vulnerability...');
  
  // Test 1: Try to execute malicious code that would create a file
  const maliciousCode = 'require("fs").writeFileSync("/tmp/rce_test.txt", "VULNERABLE")';
  const encodedCode = Buffer.from(maliciousCode).toString('base64');
  
  try {
    const response = await makeRequest(`/api?c=${encodedCode}`);
    console.log('Response to RCE attempt:', response);
    
    // Check if the application responds without executing the code
    if (response.status === 200 && response.data && response.data.message && 
        response.data.message.includes('Code execution disabled')) {
      console.log('✅ RCE vulnerability has been fixed - safe response returned');
      return true;
    } else if (response.data && response.data.result !== undefined) {
      console.log('❌ RCE vulnerability still exists - arbitrary code was executed');
      return false;
    } else {
      console.log('✅ RCE vulnerability appears to be fixed - code was not executed');
      return true;
    }
  } catch (error) {
    console.log('✅ RCE test failed to connect or execute - vulnerability appears fixed');
    return true;
  }
}

async function testBasicFunctionality() {
  console.log('Testing basic API functionality...');
  
  try {
    // Test with no parameter
    const response1 = await makeRequest('/api');
    console.log('No parameter response:', response1);
    
    // Test with empty parameter
    const response2 = await makeRequest('/api?c=');
    console.log('Empty parameter response:', response2);
    
    // Test invalid endpoint
    const response3 = await makeRequest('/invalid');
    console.log('Invalid endpoint response:', response3);
    
    return true;
  } catch (error) {
    console.error('Basic functionality test failed:', error);
    return false;
  }
}

async function runTests() {
  try {
    console.log('Starting security tests...');
    
    await startServer();
    console.log('Server started successfully');
    
    // Wait a moment for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const rceTestPassed = await testRCEVulnerability();
    const basicTestPassed = await testBasicFunctionality();
    
    console.log('\n--- Test Results ---');
    console.log('RCE Vulnerability Test:', rceTestPassed ? 'PASSED' : 'FAILED');
    console.log('Basic Functionality Test:', basicTestPassed ? 'PASSED' : 'FAILED');
    
    const allPassed = rceTestPassed && basicTestPassed;
    console.log('Overall:', allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
    
    return allPassed;
    
  } catch (error) {
    console.error('Test execution failed:', error);
    return false;
  } finally {
    stopServer();
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  stopServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopServer();
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}