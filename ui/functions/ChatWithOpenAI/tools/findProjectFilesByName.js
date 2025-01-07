const { readdir } = require("fs").promises;

module.exports = {
  type: "function",
  function: {
    name: "findProjectFilesByName",
    description:
      "Allows to find files in the project folder, mathing the search query",
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

    console.log("findProjectFilesByName", query);

    const files = await readdir(OUTDIR, {
      recursive: true,
    });

    const matchingFiles = files.filter((file) => file.includes(query));

    return matchingFiles;
  },
};
