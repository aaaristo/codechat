const { assertInOutputDir } = require("./utils");
const { exec } = require("child_process");

module.exports = {
  type: "function",
  function: {
    name: "executeCommand",
    description:
      "Allows to execute commands like npm / git or aws cli relative to the project folder, and returns the output so you can check it",
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
  resolver: async (args) => {
    const { path, command } = args;

    const output = await execAsync(command, {
      env: process.env,
      cwd: assertInOutputDir(path),
    });

    console.log("executeCommand", path, command, output);

    return output;
  },
};

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
