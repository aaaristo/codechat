const { readFile } = require("fs").promises;
const { assertInOutputDir } = require("./utils");

module.exports = {
  type: "function",
  function: {
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
  resolver: async (args) => {
    const { path, encoding } = args;

    console.log("readProjectFile", path, encoding);

    const resolvedPath = assertInOutputDir(path);

    try {
      const content = await readFile(resolvedPath, encoding);

      return content;
    } catch (error) {
      return `Error reading file: ${error.message}`;
    }
  },
};
