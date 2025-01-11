const { writeFile } = require("fs").promises;
const { dirname } = require("path");
const { mkdirp } = require("mkdirp");
const { assertInOutputDir } = require("./utils");

module.exports = {
  type: "function",
  function: {
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
  resolver: async (args) => {
    const { path, content, encoding } = args;

    console.log("saveProjectFile", path, encoding);

    const resolvedPath = assertInOutputDir(path);

    await mkdirp(dirname(resolvedPath));

    await writeFile(resolvedPath, Buffer.from(content, encoding));

    return "File created successfully";
  },
};
