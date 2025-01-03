const express = require("express");

const app = express();

// cors
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

app.use(express.json({ limit: "50mb" }));

const apiGateway = require("./ui/api-gateway");

for (const path in apiGateway) {
  const { method, functionName } = apiGateway[path];

  const handler = require(`./ui/functions/${functionName}`).handler;

  console.log(path, method, functionName);

  app[method.toLowerCase()](path, async (req, res) => {
    try {
      const { statusCode, body } = await handler({
        body: JSON.stringify(req.body),
      });

      res.status(statusCode).json(JSON.parse(body));
    } catch (error) {
      console.error("Error handling request:", error);
      res.status(500).json({ error: error.message });
    }
  });
}

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
