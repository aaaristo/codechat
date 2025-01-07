const { unlink } = require("fs").promises;
const { assertInOutputDir } = require("./utils");

module.exports = {
  type: "function",
  function: {
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
  resolver: async (args) => {
    const { path } = args;

    console.log("deleteProjectFile", path);

    const resolvedPath = assertInOutputDir(path);

    await unlink(resolvedPath);

    return "File deleted successfully";
  },
};
