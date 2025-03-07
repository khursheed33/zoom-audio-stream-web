# Zoom Audio WebSocket Streamer

This project is a Node.js application that streams audio from multiple Zoom meetings in real-time using the Zoom Web SDK, PulseAudio virtual sinks, and a WebSocket server. It provides a web-based UI served at `http://localhost:3000` where users can input Zoom meeting credentials (SDK Key, SDK Secret, Meeting ID, Password, Interpretation Language) to join meetings dynamically. Audio streams are delivered to the UI via WebSocket (`ws://localhost:8080`) and played in browser-based audio players. The entire application runs in a Docker container for portability and consistency.

## Features
- **Dynamic Meeting Joins**: Add Zoom meetings via a web UI with custom credentials.
- **Real-Time Audio Streaming**: Streams audio from each meeting to the browser using WebSocket.
- **Multi-Meeting Support**: Handles multiple simultaneous Zoom meetings with isolated audio streams.
- **Dockerized**: Runs in a container with all dependencies (Node.js, PulseAudio, FFmpeg).
- **Interpretation Support**: Selects specific interpretation languages for each meeting.

## Prerequisites
- **Docker**: Installed on your system ([Install Docker](https://docs.docker.com/get-docker/)).
- **Zoom SDK Credentials**: Obtain an SDK Key and Secret from the [Zoom Marketplace](https://marketplace.zoom.us/) by creating a "Meeting SDK" app.
- **Linux Host (Recommended)**: For native PulseAudio support; Windows can work with adjustments (see Notes).

## Project Structure
```
zoom-audio-websocket/
├── Dockerfile        # Docker configuration
├── index.js          # Main app with WebSocket and UI serving
├── zoom-client.js    # Zoom Web SDK and audio streaming logic
├── ui.html           # Web UI served at localhost:3000
├── package.json      # Node.js dependencies
├── config.json       # Optional default meeting details
└── .dockerignore     # Ignores unnecessary files
```

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd zoom-audio-websocket
```

### 2. Build the Docker Image
```bash
docker build -t zoom-audio-websocket .
```
This creates a Docker image with Ubuntu 22.04, Node.js, PulseAudio, and FFmpeg.

### 3. Run the Docker Container
```bash
docker run -d \
  --name zoom-audio \
  -p 3000:3000 \
  -p 8080:8080 \
  --device /dev/snd \
  -v /run/user/$(id -u)/pulse:/run/user/1000/pulse \
  zoom-audio-websocket
```
- `-p 3000:3000`: Exposes the UI server.
- `-p 8080:8080`: Exposes the WebSocket server.
- `--device /dev/snd`: Grants audio device access.
- `-v /run/user/...`: Mounts the PulseAudio socket (adjust `1000` to your user ID if needed).

### 4. Verify the Container
Check the logs to ensure the app is running:
```bash
docker logs zoom-audio
```
Expected output:
```
Server running on http://localhost:3000
WebSocket server running on ws://localhost:8080
```

## Usage

### Accessing the UI
1. Open a browser and navigate to `http://localhost:3000`.
2. You’ll see the "Zoom Audio Streamer" interface with input fields.

### Adding a Meeting
1. **SDK Key and Secret**: Enter your Zoom SDK Key and Secret (from Zoom Marketplace).
2. **Meeting Details**: Input a Meeting ID, Password (if required), and select an Interpretation Language (e.g., English).
3. **Join Meeting**: Click "Add Meeting".
   - The meeting appears in the UI with its ID, language, and an audio player.
   - Audio streams automatically play as they arrive via WebSocket.

### Streaming Audio
- The WebSocket server (`ws://localhost:8080`) sends audio chunks tagged with `meetingId`.
- Each meeting’s audio plays in its respective `<audio>` element in the UI.

### Stopping the Application
Stop the container gracefully:
```bash
docker stop zoom-audio
```
This cleans up PulseAudio sinks, Zoom instances, and the WebSocket server.

## Example Workflow
1. Start the container.
2. Visit `http://localhost:3000`.
3. Enter SDK Key: `your-sdk-key`, SDK Secret: `your-sdk-secret`, Meeting ID: `123456789`, Password: `pass123`, Language: `English`.
4. Click "Add Meeting".
5. Repeat for another meeting (e.g., Meeting ID: `987654321`).
6. Hear audio from both meetings in separate players.

## Troubleshooting

### No Audio
- **PulseAudio**: Ensure PulseAudio is running in the container (`docker exec -it zoom-audio pactl list sinks`).
- **Host Audio**: Verify `--device /dev/snd` and PulseAudio socket mounting. Try `--network host` if issues persist.
- **Meeting Access**: Confirm Meeting ID, Password, and SDK credentials are valid.

### WebSocket Connection Fails
- Check `ws://localhost:8080` is accessible (port 8080 is exposed).
- Inspect browser console for errors.

### Resource Usage
- Each meeting uses ~100-200MB RAM and 20-50% CPU. Scale with a robust host (e.g., 8-core, 16GB RAM for 10 meetings).

## Notes
- **Windows Support**: Use Virtual Audio Cable (VAC) instead of PulseAudio. Adjust `zoom-client.js` to use `-f dshow` with VAC devices (e.g., `audio=Line 1`). Pre-install VAC cables.
- **Audio Latency**: MP3 streaming may have slight delays. For lower latency, modify `zoom-client.js` to use PCM (`-f s16le`) and update the UI to handle raw audio.
- **Security**: In production, secure the WebSocket with WSS (SSL/TLS) and add authentication.
- **Scalability**: Test with 2-3 meetings initially; increase resources for more.

## Contributing
Feel free to submit issues or pull requests to enhance functionality (e.g., stop meeting buttons, improved audio handling).

## License
This project is unlicensed and provided as-is for educational purposes.

---

This `README.md` provides everything needed to understand, set up, and use the application. Save it in your project root and adjust `<repository-url>` if you host it online. Let me know if you’d like additional sections or refinements!
