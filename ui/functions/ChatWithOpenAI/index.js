const OpenAI = require("openai");
const fs = require("fs");
const { mkdirp } = require("mkdirp");
const { dirname } = require("path");
const { exec } = require("child_process");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OUTDIR = process.env.CODEIT_OUTPUT_FOLDER || ".";
const MODEL = process.env.CODEIT_MODEL || "gpt-4o"; // or gpt-4-0613

if (!fs.existsSync(OUTDIR)) {
  fs.mkdirSync(OUTDIR, { recursive: true });
}

console.log("OUTDIR:", OUTDIR);

const conversationPath = `${OUTDIR}/conversation.json`;

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

let developerMessage;

if (fs.existsSync(developerPath)) {
  developerMessage = fs.readFileSync(developerPath, "utf-8");
} else {
  developerMessage = fs.readFileSync(`${__dirname}/DEVELOPER.md`, "utf-8");
}

conversation.unshift({
  role: "developer",
  content: developerMessage,
});

exports.handler = async (event) => {
  const { messages } = JSON.parse(event.body);

  try {
    conversation.push({ role: "user", content: messages });

    const response = await createChatCompletionWithRetries({
      model: MODEL,
      messages: [...conversation, { role: "user", content: messages }],
      tools,
      tool_choice: "auto",
    });

    const completionMessage = await evaluateResponse(response);

    // Write updated conversation history back to the file
    fs.writeFileSync(conversationPath, JSON.stringify(conversation, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: completionMessage }),
    };
  } catch (error) {
    console.error(
      "Error in contacting OpenAI API or handling local files:",
      error.message
    );
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

async function evaluateResponse(response) {
  // console.log(JSON.stringify(response, null, 4));

  // Grab the first choice
  const message = response.choices[0].message;

  if (message.tool_calls) {
    // The model wants to call a function

    conversation.push(message);

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

    return evaluateResponse(response);
  } else {
    // Regular (non-function-calling) response
    conversation.push(message);
    return message.content;
  }
}

const execAsync = (command, options) => {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      resolve({
        stdout,
        stderr,
        error,
      });
    });
  });
};

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
      }

      console.error("Error in contacting OpenAI API:", error.message);

      throw error;
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
    console.error("Error handling function call:", error);
    throw error;
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

const functions = [
  {
    name: "saveProjectFile",
    description:
      "Allows to create a file in the project folder, for binary files it is possible to send the content via Base64",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "The path of the file relative to the project root folder",
        },
        content: {
          type: "string",
          description: "The javascript code for the lambda function",
        },
        encoding: {
          type: "string",
          description: "The encoding of the content, default is utf8",
          enum: ["utf8", "base64"],
        },
      },
      required: ["path", "content", "encoding"],
    },
  },
  {
    name: "deleteProjectFile",
    description: "Allows to delete a file in the project folder",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "The path of the file relative to the project root folder",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "deleteProjectFolder",
    description: "Allows to delete a folder recursively",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "The path of the folder relative to the project root folder",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "readProjectFile",
    description: "Allows to read a file in the project folder",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "The path of the file relative to the project root folder",
        },
        encoding: {
          type: "string",
          description: "The encoding of the content, default is utf8",
          enum: ["utf8", "base64"],
        },
      },
      required: ["path"],
    },
  },
  {
    name: "listProjectFiles",
    description: "Allows to list all files in the project folder",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "The path of the folder relative to the project root folder",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "executeCommand",
    description:
      "Allows to execute commands like npm / git or aws cli relative to the project folder",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The path under which the command should be executed",
        },
        command: {
          type: "string",
          description: "The command that should be executed",
        },
      },
      required: ["path", "command"],
    },
  },
];

const tools = functions.map((f) => ({ type: "function", function: f }));

const fn = {};

fn.saveProjectFile = async (args) => {
  const { path, content, encoding } = args;

  console.log("saveProjectFile", path);

  await mkdirp(`${OUTDIR}/${dirname(path)}`);

  await fs.promises.writeFile(
    `${OUTDIR}/${path}`,
    Buffer.from(content, encoding)
  );

  return "File created successfully";
};

fn.deleteProjectFile = async (args) => {
  const { path } = args;

  console.log("deleteProjectFile", path);

  await fs.promises.unlink(`${OUTDIR}/${path}`);

  return "File deleted successfully";
};

fn.deleteProjectFolder = async (args) => {
  const { path } = args;

  console.log("deleteProjectFolder", path);

  await fs.promises.rm(`${OUTDIR}/${path}`, { recursive: true });

  return "Folder deleted successfully";
};

fn.readProjectFile = async (args) => {
  const { path, encoding } = args;

  console.log("readProjectFile", path, encoding);

  const content = await fs.promises.readFile(`${OUTDIR}/${path}`, encoding);

  return content;
};

fn.listProjectFiles = async (args) => {
  const { path } = args;

  console.log("listProjectFiles", path);

  const files = await fs.promises.readdir(`${OUTDIR}/${path}`, {
    recursive: true,
  });

  return files;
};

fn.executeCommand = async (args) => {
  const { path, command } = args;

  console.log("executeCommand", path, command);

  const output = await execAsync(command, {
    env: process.env,
    cwd: `${OUTDIR}/${path}`,
  });

  return output;
};
