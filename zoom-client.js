const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const ffmpeg = require('fluent-ffmpeg');

async function joinZoomMeeting({ sdkKey, sdkSecret, meetingId, password, interpretationLanguage, audioSink, ws }) {
  // Generate Zoom JWT signature
  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  const payload = {
    appKey: sdkKey,
    iat,
    exp,
    tpc: meetingId,
    pwd: password,
  };
  const signature = jwt.sign(payload, sdkSecret, { algorithm: 'HS256' });

  // Launch headless browser with specific audio sink
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--alsa-output-device=plughw:${audioSink}`,
    ],
  });
  const page = await browser.newPage();

  // Join Zoom meeting
  await page.goto('about:blank');
  await page.evaluate(
    async (sdkKey, signature, meetingId, password, interpretationLanguage) => {
      const script = document.createElement('script');
      script.src = 'https://source.zoom.us/2.18.0/lib/zoom/zoom.js';
      document.head.appendChild(script);

      await new Promise((resolve) => (script.onload = resolve));

      window.ZoomMtg.setZoomJSLib('https://source.zoom.us/2.18.0/lib', '/av');
      window.ZoomMtg.preLoadWasm();
      window.ZoomMtg.prepareWebSDK();

      window.ZoomMtg.init({
        leaveUrl: 'http://localhost:3000',
        success: () => {
          window.ZoomMtg.join({
            sdkKey,
            signature,
            meetingNumber: meetingId,
            userName: 'AudioBot',
            passWord: password,
            success: () => {
              console.log(`Joined meeting ${meetingId}`);
              window.ZoomMtg.switchLanguage(interpretationLanguage);
            },
            error: (err) => console.error(`Join error for ${meetingId}:`, err),
          });
        },
        error: (err) => console.error(`Init error for ${meetingId}:`, err),
      });
    },
    sdkKey,
    signature,
    meetingId,
    password,
    interpretationLanguage
  );

  // Start streaming audio to WebSocket
  const recordingProcess = streamAudio(meetingId, audioSink, ws);

  return { browser, page, recordingProcess };
}

function streamAudio(meetingId, audioSink, ws) {
  const process = ffmpeg()
    .input(`pulse:${audioSink}`)
    .inputOptions('-f pulse')
    .outputOptions('-f mp3') // Stream as MP3
    .pipe() // Pipe raw audio data
    .on('start', () => console.log(`Streaming started for ${meetingId}`))
    .on('error', (err) => console.error(`Streaming error for ${meetingId}:`, err));

  process.on('data', (chunk) => {
    // Send audio chunk to WebSocket clients with meeting ID
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ meetingId, audio: chunk.toString('base64') }));
    }
  });

  return process;
}

module.exports = { joinZoomMeeting };