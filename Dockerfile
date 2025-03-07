FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    pulseaudio \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install
COPY . .

RUN echo "enable-shm = no" >> /etc/pulse/daemon.conf

EXPOSE 3000 8080

CMD ["sh", "-c", "pulseaudio --start && npm start"]