# CodeChat

CodeChat is a chat application using OpenAI to help you code faster. It can be run via `npx codechat` in an empty directory to help you scaffold your project. And enables OpenAI models to read and write files in your project folder, and to run commands to install dependencies, start your project, and more.

## Features

- Chat with OpenAI to get coding assistance
- Scaffold your project with ease
- Handles file operations securely

## Installation

You can run CodeChat directly using `npx`:

```sh
npx codechat
```

## UI

The UI is a simple chat interface that allows you to interact with OpenAI. You can ask questions, upload images, and monitor
what the model is doing in the console. By default you can access it on `http://localhost:3000`. The conversation will be
kept for context in your project folder.

## Environment Variables
Make sure to set the following environment variables:

* OPENAI_API_KEY: Your OpenAI API key. This is required to interact with the OpenAI API.
* CODECHAT_PORT (optional): The port on which the server will run. Defaults to `3000`.
* CODECHAT_MODEL (optional): The OpenAI model to use. Defaults to `gpt-4o`.
* CODECHAT_OUTPUT_FOLDER (optional): The folder where output files will be saved. Defaults to the current working directory.