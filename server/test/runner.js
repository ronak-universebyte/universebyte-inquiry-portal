import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, '../src/index.js');
const testSuitePath = path.resolve(__dirname, 'e2e-verification.js');

async function waitForHealth(maxRetries = 25) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch('http://localhost:5000/api/health');
      if (res.ok) {
        const json = await res.json();
        console.log('Server is healthy and online:', json);
        return true;
      }
    } catch (e) {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return false;
}

async function run() {
  console.log('Starting UniverseByte Backend server for verification...');
  const server = spawn('node', [serverPath], {
    cwd: path.resolve(__dirname, '..'),
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  server.on('error', (err) => {
    console.error('Server process error:', err);
  });

  try {
    const isReady = await waitForHealth();
    if (!isReady) {
      throw new Error('Server failed to become healthy within timeout.');
    }

    console.log('\nRunning test suite against MongoDB Atlas backend...\n');
    const testProcess = spawn('node', [testSuitePath], {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'inherit',
    });

    const exitCode = await new Promise((resolve) => {
      testProcess.on('exit', (code) => resolve(code || 0));
    });

    console.log(`\nTest suite finished with exit code: ${exitCode}`);
    server.kill('SIGINT');
    setTimeout(() => {
      try { server.kill('SIGKILL'); } catch (e) {}
      process.exit(exitCode);
    }, 1000);
  } catch (err) {
    console.error('Test Runner encountered error:', err.message);
    server.kill('SIGINT');
    process.exit(1);
  }
}

run();
