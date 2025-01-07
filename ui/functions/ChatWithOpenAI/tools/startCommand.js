const { assertInOutputDir } = require("./utils");
const { exec } = require("child_process");

module.exports = {
  type: "function",
  function: {
    name: "startCommand",
    description:
      "Allows to execute commands like npm / git or aws cli relative to the project folder similar to executeCommand, but does not wait for the command to finish, useful for npm start like commands",
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
        timeout: {
          type: "integer",
          description:
            "The number of milliseconds to wait for the command to finish, before returning the output and letting it run. Defaults to 5000.",
        },
      },
      required: ["path", "command"],
    },
  },
  resolver: async (args) => {
    const { path, command, timeout } = args;

    console.log("startCommand", path, command);

    return new Promise((resolve, reject) => {
      const child = exec(command, {
        env: process.env,
        cwd: assertInOutputDir(path),
      });

      let output = "";

      child.stdout.on("data", (data) => {
        output += data;
      });

      child.stderr.on("data", (data) => {
        output += data;
      });

      setTimeout(() => {
        console.log("startCommand output", output);
        resolve(output);
      }, timeout || 5000);

      child.on("error", (error) => {
        reject(`Error starting command: ${error.message}`);
      });
    });
  },
};
