#!/usr/bin/env node

/**
 * replExample.js
 *
 * A simple Node.js REPL that integrates with OpenAI's ChatGPT,
 * demonstrating function calling.
 */

require('dotenv').config(); // if you store OPENAI_API_KEY in a .env file
const repl = require('repl');
const { Configuration, OpenAIApi } = require('openai');

// 1. Configure the OpenAI client
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// 2. Define our function(s) for ChatGPT to call
//    In this simple example, we'll have one function that adds two numbers.
const functions = [
  {
    name: 'addNumbers',
    description: 'Add two numbers and return the result',
    parameters: {
      type: 'object',
      properties: {
        a: {
          type: 'number',
          description: 'The first number',
        },
        b: {
          type: 'number',
          description: 'The second number',
        },
      },
      required: ['a', 'b'],
    },
  },
];

// 3. Keep track of the conversation in a messages array
//    We'll store user prompts and assistant replies so ChatGPT has context.
const conversation = [
  { role: 'system', content: 'You are a helpful assistant that can call functions if needed.' },
];

// 4. Simple in-memory function dispatcher
async function handleFunctionCall(functionCall) {
  const { name, arguments: argsJson } = functionCall;
  let result = null;

  try {
    const args = JSON.parse(argsJson);
    switch (name) {
      case 'addNumbers':
        // Our custom logic for adding numbers
        result = args.a + args.b;
        break;

      // You can add more functions and their logic here.
      default:
        throw new Error(`Function ${name} is not implemented.`);
    }
  } catch (error) {
    console.error('Error handling function call:', error);
    throw error;
  }

  // Return the function result to ChatGPT as a message from "function"
  // so that ChatGPT can continue the conversation with the result.
  const functionResponse = {
    name,
    role: 'function',
    content: JSON.stringify(result),
  };
  return functionResponse;
}

// 5. Define a helper to send user messages & handle ChatGPT’s response
async function chatWithGPT(userInput) {
  // Add the user's message to conversation
  conversation.push({ role: 'user', content: userInput });

  // Send conversation to ChatGPT
  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo-0613',   // or gpt-4-0613 if you have access
    messages: conversation,
    functions,
    function_call: 'auto', // Let the model decide if it should call a function
  });

  // Grab the first choice
  const message = response.data.choices[0].message;

  if (message.function_call) {
    // The model wants to call a function
    const functionCall = message.function_call;
    const functionResponseMsg = await handleFunctionCall(functionCall);
    // Push the function call message and the function's response to the conversation
    conversation.push({
      role: 'assistant',
      content: null,
      function_call: functionCall,
    });
    conversation.push(functionResponseMsg);

    // Now we ask ChatGPT again, providing the function result, so it can finalize its answer
    const secondResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo-0613',
      messages: conversation,
    });

    const finalMessage = secondResponse.data.choices[0].message;
    // Add the final ChatGPT message to the conversation
    conversation.push(finalMessage);

    return finalMessage.content;
  } else {
    // Regular (non-function-calling) response
    conversation.push(message);
    return message.content;
  }
}

// 6. Start a Node.js REPL
const server = repl.start({
  prompt: 'ChatGPT> ',
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

console.log('Welcome to the ChatGPT REPL with function calling!');
console.log('Type your message and press Enter. Ctrl+C twice to exit.');
