const { readdir, readFile } = require("fs").promises;
const { OUTDIR } = require("./utils");

module.exports = {
  type: "function",
  function: {
    name: "findProjectFilesByContent",
    description:
      "Allows to find files in the project folder, mathing the search query in the content of the files",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "The search query to find files in the project root folder",
        },
      },
      required: ["query"],
    },
  },
  resolver: async (args) => {
    const { query } = args;

    console.log("findProjectFilesByContent", query);

    const files = await readdir(OUTDIR, {
      recursive: true,
    });

    const matchingFiles = [];

    for (const file of files) {
      try {
        const content = await readFile(file, "utf8");

        if (content.includes(query)) {
          matchingFiles.push(file);
        }
      } catch (error) {
        if (error.code !== "EISDIR") throw error;
      }
    }

    return matchingFiles;
  },
};
