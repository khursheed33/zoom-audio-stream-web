const express = require('express');
const { execSync } = require('child_process');
const WebSocket = require('ws');
const { joinZoomMeeting } = require('./zoom-client');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;
const wssPort = 8080;

const meetingInstances = new Map();

// Serve UI at localhost:3000
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ui.html'));
});

// WebSocket server
const wss = new WebSocket.Server({ port: wssPort });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    if (data.action === 'join') {
      const { sdkKey, sdkSecret, meetingId, password, interpretationLanguage } = data;

      // Create virtual audio sink
      const audioSink = await createVirtualSink(meetingId);
      console.log(`Created virtual sink ${audioSink} for meeting ${meetingId}`);

      // Join Zoom meeting and stream audio
      const instance = await joinZoomMeeting({
        sdkKey,
        sdkSecret,
        meetingId,
        password,
        interpretationLanguage,
        audioSink,
        ws,
      });

      meetingInstances.set(meetingId, { ...instance, audioSink });
    }
  });
  ws.on('close', () => console.log('WebSocket client disconnected'));
});

async function createVirtualSink(meetingId) {
  const sinkName = `ZoomSink_${meetingId}`;
  execSync(`pactl load-module module-null-sink sink_name=${sinkName} sink_properties=device.description=${sinkName}`);
  return sinkName;
}

async function cleanupVirtualSink(sinkName) {
  try {
    const moduleInfo = execSync(`pactl list short modules | grep ${sinkName}`).toString();
    const moduleId = moduleInfo.split('\t')[0];
    if (moduleId) {
      execSync(`pactl unload-module ${moduleId}`);
    }
  } catch (err) {
    console.log(`No module found for ${sinkName}`);
  }
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`WebSocket server running on ws://localhost:${wssPort}`);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  for (const [meetingId, { browser, recordingProcess, audioSink }] of meetingInstances) {
    recordingProcess.kill('SIGINT');
    await browser.close();
    await cleanupVirtualSink(audioSink);
  }
  wss.close();
  process.exit(0);
});