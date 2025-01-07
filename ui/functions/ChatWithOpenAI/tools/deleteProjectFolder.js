const { rm } = require("fs").promises;
const { assertInOutputDir } = require("./utils");

module.exports = {
  type: "function",
  function: {
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
  resolver: async (args) => {
    const { path } = args;

    console.log("deleteProjectFolder", path);

    const resolvedPath = assertInOutputDir(path);

    await rm(resolvedPath, { recursive: true });

    return "Folder deleted successfully";
  },
};
