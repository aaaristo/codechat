#!/usr/bin/env node
const express = require("express");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");

const app = express();
const server = createServer(app);

if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_AZURE_ENDPOINT) {
  console.error(
    "The OPENAI_API_KEY environment variable is not set. Get one here https://platform.openai.com/api-keys"
  );
  console.error(
    "Alternatively you can define an OPENAI_AZURE_ENDPOINT environment variable. Get on Azure AI Foundry https://ai.azure.com/ in the deployment section"
  );
  process.exit(1);
}

// cors
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

app.use(express.json({ limit: "50mb" }));

app.use(express.static(`${__dirname}/ui/web/public`));

const apiGateway = require("./ui/api-gateway");

for (const path in apiGateway) {
  const { method, functionName } = apiGateway[path];

  const handler = require(`./ui/functions/${functionName}`).handler;

  console.log(path, method, functionName);

  app[method.toLowerCase()](path, async (req, res) => {
    try {
      const { statusCode, body } = await handler({
        body: JSON.stringify(req.body),
        sendMessage,
      });

      res.status(statusCode).json(JSON.parse(body));
    } catch (error) {
      console.error("Error handling request:", error);
      res.status(500).json({ error: error.message });
    }
  });
}

// WebSocket server
const wss = new WebSocketServer({ noServer: true });

const connections = [];

wss.on("connection", (ws) => {
  console.log("WebSocket connection established");

  ws.on("message", (message) => {
    console.log("Received:", message);
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
    connections.splice(connections.indexOf(ws), 1);
  });

  connections.push(ws);
});

server.on("upgrade", (request, socket, head) => {
  const pathname = request.url;

  if (pathname === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

const port = process.env.CODECHAT_PORT || 3000;

server.listen(+port, () => {
  console.log(`Server is running on port ${port}`);
});

const sendMessage = (message) => {
  for (const ws of connections) {
    ws.send(message);
  }
};
