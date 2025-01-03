const repl = require("repl");
const { OpenAI } = require("openai");
const { mkdirp } = require("mkdirp");
const fs = require("fs");
const { dirname } = require("path");
const { version } = require("os");
const { exec } = require("child_process");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = "gpt-4o"; // or gpt-4-0613
const OUTDIR = "out";
const APPDIR = "web";

// 2. Define our function(s) for ChatGPT to call
//    In this simple example, we'll have one function that adds two numbers.
const functions = [
  {
    name: "createLambdaFunction",
    description:
      "Allows to create a node js lambda function by providing the code",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The name of the lambda function",
        },
        description: {
          type: "string",
          description: "A description of the lambda function",
        },
        code: {
          type: "string",
          description: "The javascript code for the lambda function",
        },
      },
      required: ["name", "description", "code"],
    },
  },
  {
    name: "updateLambdaCode",
    description:
      "Allows to create a node js lambda function by providing the code",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The name of the lambda function",
        },
        description: {
          type: "string",
          description: "A description of the lambda function",
        },
        code: {
          type: "string",
          description: "The javascript code for the lambda function",
        },
      },
      required: ["name", "description", "code"],
    },
  },
  {
    name: "connectLambdaToAPIGateway",
    description:
      "Allows to create a node js lambda function by providing the code",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The path of the api gateway endpoint",
        },
        method: {
          type: "string",
          description: "The http method of the api gateway endpoint",
        },
        functionName: {
          type: "string",
          description: "The name of the lambda function",
        },
      },
      required: ["path", "method", "functionName"],
    },
  },
  {
    name: "saveApplicationFile",
    description:
      "Allows to create or update files on S3, so that they are published via cloudfront to the user browser, for binary files it is possible to send the content via Base64",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "The path of the file relative to the application http root folder",
        },
        code: {
          type: "string",
          description: "the code of the file",
        },
        content: {
          type: "string",
          description: "the Base64 encoded content of the file",
        },
      },
      required: ["name", "code", "content"],
    },
  },
  {
    name: "getAPIGatewayEndpointBaseURI",
    description: "Allows to retrieve the base URI of the API gateway endpoint",
  },
  {
    name: "addApplicationDependency",
    description:
      "Allows to add a dependency to the React application package.json file",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "The name of the npm package to be added as a dependency",
        },
        version: {
          type: "string",
          description: "the version of the npm package to be added or latest",
        },
      },
      required: ["name", "version"],
    },
  },
  {
    name: "addLambdaDependency",
    description:
      "Allows to add a dependency to a nodejs lambda function package.json file",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "The name of the npm package to be added as a dependency",
        },
        version: {
          type: "string",
          description: "the version of the npm package to be added or latest",
        },
      },
      required: ["name", "version"],
    },
  },
  {
    name: "createDynamoTable",
    description: "Allows to create a DynamoDB table",
    parameters: {
      type: "object",
      properties: {
        json: {
          type: "string",
          description:
            "The JSON describing the table to create for the AWS SDK",
        },
      },
      required: ["json"],
    },
  },
];

const saved = fs.existsSync("conversation.json")
  ? require("./conversation.json")
  : [];

saved.shift();

// 3. Keep track of the conversation in a messages array
//    We'll store user prompts and assistant replies so ChatGPT has context.
const conversation = [
  {
    role: "system",
    content: fs.readFileSync("SYSTEM", "utf-8"),
  },
  ...saved,
];

// on CTRL+C save the conversation to a file
process.on("SIGINT", async () => {
  await fs.promises.writeFile(
    "conversation.json",
    JSON.stringify(conversation)
  );
  process.exit();
});

const fn = {};

fn.createLambdaFunction = async (args) => {
  const { name, code } = args;

  console.log("Creating Lambda function", name);

  await mkdirp(`${OUTDIR}/functions/${name}`);

  await fs.promises.writeFile(
    `${OUTDIR}/functions/${name}/package.json`,
    JSON.stringify(initPackageJson(args))
  );

  await fs.promises.writeFile(`${OUTDIR}/functions/${name}/index.js`, code);

  return "Function created successfully";
};

fn.updateLambdaCode = async (args) => {
  console.log("Updating Lambda function", args.name);

  await fn.createLambdaFunction(args);

  return "Function updated successfully";
};

fn.addLambdaDependency = async (args) => {
  const { name, version } = args;

  console.log("Adding Lambda dependency", name, version);

  await mkdirp(`${OUTDIR}/functions/${name}`);

  await execAsync(`npm install ${name}@${version}`, {
    cwd: `${OUTDIR}/functions/${name}`,
  });

  return "Dependency added successfully";
};

fn.addApplicationDependency = async (args) => {
  const { name, version } = args;

  console.log("Adding React dependency", name, version);

  await mkdirp(`${OUTDIR}/${APPDIR}`);
  // run npm install

  await execAsync(`npm install ${name}@${version}`, {
    cwd: `${OUTDIR}/${APPDIR}`,
  });

  return "Dependency added successfully";
};

fn.saveApplicationFile = async (args) => {
  const { path, code, content } = args;

  console.log("Creating file", path);

  await mkdirp(`${OUTDIR}/${APPDIR}/${dirname(path)}`);

  if (!fs.existsSync(`${OUTDIR}/${APPDIR}/package.json`)) {
    await fs.promises.writeFile(
      `${OUTDIR}/${APPDIR}/package.json`,
      JSON.stringify(initPackageJson({ name: "app", description: "React app" }))
    );
  }

  if (content) {
    await fs.promises.writeFile(
      `${OUTDIR}/${APPDIR}/${path}`,
      Buffer.from(content, "base64")
    );
  } else {
    await fs.promises.writeFile(`${OUTDIR}/${APPDIR}/${path}`, code);
  }

  return "File saved successfully";
};

fn.connectLambdaToAPIGateway = async (args) => {
  const { path, method, functionName } = args;

  console.log(
    `Connected ${functionName} to API Gateway at ${path} (${method})`
  );

  await addAPIGatewayEndpoint(path, method, functionName);

  return "Lambda connected to API Gateway successfully";
};

fn.getAPIGatewayEndpointBaseURI = async () => {
  return "http://localhost:3000";
};

fn.createDynamoTable = async (args) => {
  const { json } = args;

  console.log("Creating DynamoDB table", json);

  return "DynamoDB table created successfully";
};

function initPackageJson({ name, description }) {
  return {
    name,
    description,
    version: "1.0.0",
    dependencies: {},
  };
}

// 4. Simple in-memory function dispatcher
async function handleFunctionCall(functionCall) {
  const { name, arguments: argsJson } = functionCall;
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
    role: "function",
    content: JSON.stringify(result),
  };
  return functionResponse;
}

// 5. Define a helper to send user messages & handle ChatGPT’s response
async function chatWithGPT(userInput) {
  // Add the user's message to conversation
  conversation.push({ role: "user", content: userInput });

  // Send conversation to ChatGPT
  const response = await createChatCompletionWithRetries({
    model: MODEL,
    messages: conversation,
    functions,
    function_call: "auto", // Let the model decide if it wants to call the function
  });

  return evaluateResponse(response);
}

async function evaluateResponse(response) {
  // console.log(JSON.stringify(response, null, 4));

  // Grab the first choice
  const message = response.choices[0].message;

  if (message.function_call) {
    // The model wants to call a function
    const functionCall = message.function_call;
    const functionResponseMsg = await handleFunctionCall(functionCall);
    // Push the function call message and the function's response to the conversation
    conversation.push({
      role: "assistant",
      content: null,
      function_call: functionCall,
    });
    conversation.push(functionResponseMsg);

    // Now we ask ChatGPT again, providing the function result, so it can finalize its answer
    const response = await createChatCompletionWithRetries({
      model: MODEL,
      messages: conversation,
      functions,
      function_call: "auto", // Let the model decide if it wants to call the function
    });

    return evaluateResponse(response);
  } else {
    // Regular (non-function-calling) response
    conversation.push(message);
    console.log(message.content);
    return "";
  }
}

console.log("Welcome to the ChatGPT REPL with function calling!");
console.log("Type your message and press Enter. Ctrl+C twice to exit.");

// 6. Start a Node.js REPL
const server = repl.start({
  prompt: "Sfera> ",
  eval: async (cmd, context, filename, callback) => {
    try {
      // `cmd` includes a trailing newline, so trim it
      const userInput = cmd.trim();
      if (!userInput) {
        return callback(null);
      }
      const answer = await chatWithGPT(userInput);
      callback(null, answer);
    } catch (error) {
      callback(error);
    }
  },
});

const addAPIGatewayEndpoint = async (path, method, functionName) => {
  const apiGatewayPath = `${OUTDIR}/api-gateway.json`;
  const apiGateway = fs.existsSync(apiGatewayPath)
    ? JSON.parse(await fs.promises.readFile(apiGatewayPath, "utf-8"))
    : {};

  apiGateway[path] = {
    method,
    functionName,
  };

  await fs.promises.writeFile(
    apiGatewayPath,
    JSON.stringify(apiGateway, null, 2)
  );
};

const execAsync = (command, options) => {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
};

async function createChatCompletionWithRetries(args) {
  let response;
  while (true) {
    try {
      response = await openai.chat.completions.create({
        ...args,
        functions,
        function_call: "auto",
      });
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
