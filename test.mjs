// javascript
//
// This script connects to the OpenAI Realtime API to create a voice-based assistant.
//
// It captures audio input from your microphone, sends it to the OpenAI API for processing,
// and plays back the assistant's audio response through your speakers.
//
// **How to Run on a Mac:**
//
// 1. **Install Dependencies:**
//    - Ensure you have Node.js and npm installed.
//    - Run `npm init & npm install` to install all required packages.
//
// 2. **Set Up Environment Variables:**
//    - Create a `.env` file in the same directory as this script.
//    - Add your OpenAI API key to the `.env` file:
//      ```
//      OPENAI_API_KEY=your_api_key_here
//      ```
//
// 3. **Run the Script:**
//    - Execute the script with the command `node node_devenv.mjs`.
//
// **Note:** Make sure your microphone and speakers are properly configured and accessible on your Mac.
//

import { RealtimeClient } from "@openai/realtime-api-beta";
import mic from "mic";
import { Readable } from "stream";
import Speaker from "speaker";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error(
    "Please set your OPENAI_API_KEY in your environment variables."
  );
  process.exit(1);
}

const client = new RealtimeClient({
  apiKey: API_KEY,
  model: "gpt-4o-realtime-preview-2024-10-01",
});

client.on("conversation.updated", (event) => {
  const { item, delta } = event;
  const items = client.conversation.getItems();
  /**
   * item is the current item being updated
   * delta can be null or populated
   * you can fetch a full list of items at any time
   */
  console.log("conversation.updated", item, delta);
});

let micInstance;
let speaker;

async function main() {
  try {
    console.log("Attempting to connect...");
    await client.connect();
    client.updateSession({ voice: "alloy" });

    startAudioStream();
    console.log("Connection established successfully.");
  } catch (error) {
    console.error("Error connecting to OpenAI Realtime API:", error);
    console.log("Connection attempt failed. Retrying in 5 seconds...");
    setTimeout(main, 5000);
  }
}

main();

// errors like connection failures
client.on("error", (event) => {
  console.log("error", event);
});

// in VAD mode, the user starts speaking
// we can use this to stop audio playback of a previous response if necessary
client.on("conversation.interrupted", () => {
  console.log("conversation.interrupted");
});

// only triggered after item added to conversation
client.on("conversation.item.appended", ({ item }) => {
  console.log("conversation.item.appended", item);
});

client.on("conversation.item.completed", ({ item }) => {
  console.log("Conversation item completed:", item);

  if (
    item.type === "message" &&
    item.role === "assistant" &&
    item.formatted &&
    item.formatted.audio
  ) {
    console.log("Playing audio response...");
    playAudio(item.formatted.audio);
  } else {
    console.log("No audio content in this item.");
  }
});

// BEGIN MANAGE Mac AUDIO INTERFACES

function startAudioStream() {
  try {
    micInstance = mic({
      rate: "24000",
      channels: "1",
      debug: false,
      exitOnSilence: 6,
      fileType: "raw",
      encoding: "signed-integer",
    });

    const micInputStream = micInstance.getAudioStream();

    micInputStream.on("error", (error) => {
      console.error("Microphone error:", error);
    });

    micInstance.start();
    console.log("Microphone started streaming.");

    let audioBuffer = Buffer.alloc(0);
    const chunkSize = 4800; // 0.2 seconds of audio at 24kHz

    micInputStream.on("data", (data) => {
      audioBuffer = Buffer.concat([audioBuffer, data]);

      while (audioBuffer.length >= chunkSize) {
        const chunk = audioBuffer.slice(0, chunkSize);
        audioBuffer = audioBuffer.slice(chunkSize);

        const int16Array = new Int16Array(
          chunk.buffer,
          chunk.byteOffset,
          chunk.length / 2
        );

        try {
          client.appendInputAudio(int16Array);
        } catch (error) {
          console.error("Error sending audio data:", error);
        }
      }
    });

    micInputStream.on("silence", () => {
      console.log("Silence detected, creating response...");
      try {
        client.createResponse();
      } catch (error) {
        console.error("Error creating response:", error);
      }
    });
  } catch (error) {
    console.error("Error starting audio stream:", error);
  }
}

const queue = [];

function playAudio(audioData) {
  try {
    if (!speaker) {
      speaker = new Speaker({
        channels: 1,
        bitDepth: 16,
        sampleRate: 24000,
      });
    } else {
      queue.push(audioData);
      return;
    }

    // Convert Int16Array to Buffer
    const buffer = Buffer.from(audioData.buffer);

    // Create a readable stream from the buffer
    const readableStream = new Readable({
      read() {
        this.push(buffer);
        this.push(null);
      },
    });

    // Pipe the stream to the speaker
    readableStream.pipe(speaker);
    console.log(
      "Audio sent to speaker for playback. Buffer length:",
      buffer.length
    );

    // Handle the 'close' event to recreate the speaker for the next playback
    speaker.on("close", () => {
      console.log("Speaker closed. Recreating for next playback.");
      speaker = null;
      const next = queue.shift();
      if (next) {
        playAudio(next);
      }
    });
  } catch (error) {
    console.error("Error playing audio:", error);
  }
}

// END MANAGE AUDIO INTERFACES
