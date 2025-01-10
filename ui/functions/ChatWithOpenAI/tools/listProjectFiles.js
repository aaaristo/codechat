const { readdir } = require("fs").promises;
const { assertInOutputDir, folderExists } = require("./utils");

module.exports = {
  type: "function",
  function: {
    name: "listProjectFiles",
    description:
      "Allows to list all files in the project folder, paginated, please go through the pages by incrementing the page number until total pages are reached",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "The path of the folder relative to the project root folder",
        },
        page: {
          type: "number",
          description: "The page number",
        },
      },
      required: ["path"],
    },
  },
  resolver: async (args) => {
    const { path, page = 1 } = args;

    const pageSize = 100;

    console.log("listProjectFiles", path, page, pageSize);

    const resolvedPath = assertInOutputDir(path);

    if (!(await folderExists(resolvedPath))) {
      return {
        files: [],
        totalFiles: 0,
        currentPage: 1,
        totalPages: 1,
        instructions: `The path ${path} does not exist`,
      };
    }

    const files = await readdir(resolvedPath, {
      recursive: true,
    });

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pagedFiles = files.slice(start, end);

    return {
      files: pagedFiles,
      totalFiles: files.length,
      currentPage: page,
      totalPages: Math.ceil(files.length / pageSize),
      instructions:
        end < files.length
          ? "There are more files, please go to the next page"
          : "You fetched all files",
    };
  },
};
