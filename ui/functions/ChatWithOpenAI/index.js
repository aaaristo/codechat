const OpenAI = require("openai");
const fs = require("fs");
const { formatToolCalls } = require("../utils");

const tools = require("./tools");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OUTDIR = process.env.CODECHAT_OUTPUT_FOLDER || ".";
const MODEL = process.env.CODECHAT_MODEL || "gpt-4o"; // or gpt-4-0613

if (!fs.existsSync(OUTDIR)) {
  fs.mkdirSync(OUTDIR, { recursive: true });
}

console.log("OUTDIR:", OUTDIR);

const conversationPath = `${OUTDIR}/codechat.json`;

let conversation = [];
if (fs.existsSync(conversationPath)) {
  const fileContent = fs.readFileSync(conversationPath, "utf-8");
  conversation = JSON.parse(fileContent);
}

conversation = conversation.filter(
  (msg) =>
    msg.role !== "system" && msg.role !== "function" && msg.role !== "developer"
);

const developerPath = `${OUTDIR}/DEVELOPER.md`;

conversation = conversation.filter((x) => x.role !== "developer");

let developerMessage = fs.readFileSync(`${__dirname}/DEVELOPER.md`, "utf-8");

conversation.push({
  role: "developer",
  content: developerMessage,
});

if (fs.existsSync(developerPath)) {
  console.log("Developer message found");
  const developerMessage = fs.readFileSync(developerPath, "utf-8");
  conversation.push({
    role: "developer",
    content: developerMessage,
  });
}

const fn = {};

for (const tool of tools) {
  fn[tool.function.name] = tool.resolver;
  delete tool.resolver;
}

exports.handler = async (event) => {
  const { messages } = JSON.parse(event.body);

  try {
    conversation.push({ role: "user", content: messages });

    const response = await createChatCompletionWithRetries({
      model: MODEL,
      messages: [...conversation, { role: "user", content: messages }],
      tools,
      tool_choice: "required",
    });

    const completionMessage = await evaluateResponse(response, event);

    // Write updated conversation history back to the file
    fs.writeFileSync(conversationPath, JSON.stringify(conversation, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: completionMessage }),
    };
  } catch (error) {
    console.error(
      "Error in contacting OpenAI API or handling local files:",
      error.message,
      error.code,
      error.stack
    );

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

async function evaluateResponse(response, event) {
  // console.log(JSON.stringify(response, null, 4));

  // Grab the first choice
  const message = response.choices[0].message;

  if (message.tool_calls) {
    // The model wants to call a function

    conversation.push(message);

    event.sendMessage(
      JSON.stringify({
        user: "AI",
        tool_calls: formatToolCalls(message.tool_calls),
      })
    );

    await Promise.all(
      message.tool_calls.map(async (functionCall) => {
        const functionResponseMsg = await handleFunctionCall(functionCall);
        // Push the function call message and the function's response to the conversation
        conversation.push(functionResponseMsg);
      })
    );

    // Now we ask ChatGPT again, providing the function result, so it can finalize its answer
    const response = await createChatCompletionWithRetries({
      model: MODEL,
      messages: conversation,
      tools,
      tool_choice: "auto",
    });

    return evaluateResponse(response, event);
  } else {
    // Regular (non-function-calling) response
    conversation.push(message);
    return message.content;
  }
}

async function createChatCompletionWithRetries(args) {
  let response;
  while (true) {
    try {
      response = await openai.chat.completions.create(args);
      break;
    } catch (error) {
      if (error.code === "rate_limit_exceeded") {
        console.log("Rate limit exceeded. Retrying in 5 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else if (error.code === "context_length_exceeded") {
        conversation = conversation.filter(
          (x) => x.role !== "tool" && !x.tool_calls
        );
        args.messages = conversation;
        console.log("Context limit exceeded. Retrying in 5 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        console.error(
          "Error in contacting OpenAI API:",
          error.message,
          error.code
        );

        throw error;
      }
    }
  }

  return response;
}

async function handleFunctionCall(functionCall) {
  const {
    id,
    function: { name, arguments: argsJson },
  } = functionCall;
  let result = null;

  try {
    const args = JSON.parse(argsJson);
    result = await fn[name](args);
  } catch (error) {
    console.error("Error handling function call:", error, name, argsJson);

    if (error instanceof SyntaxError) {
      result = `Error parsing arguments: ${error.message}`;
    } else {
      throw error;
    }
  }

  // Return the function result to ChatGPT as a message from "function"
  // so that ChatGPT can continue the conversation with the result.
  const functionResponse = {
    name,
    role: "tool",
    content: JSON.stringify(result),
    tool_call_id: id,
  };

  return functionResponse;
}
