const { resolve } = require("path");
const { stat } = require("fs").promises;

const OUTDIR = process.env.CODECHAT_OUTPUT_FOLDER || ".";
const RESOLVED_OUTDIR = resolve(OUTDIR);

exports.OUTDIR = OUTDIR;

exports.assertInOutputDir = (path) => {
  const resolvedPath = resolve(OUTDIR, path);

  if (!resolvedPath.startsWith(RESOLVED_OUTDIR)) {
    throw new Error(`Path must be inside the output directory: ${OUTDIR}`);
  }

  return resolvedPath;
};

exports.folderExists = async (path) => {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch (error) {
    if (error.code === "ENOENT") {
      return false; // Folder does not exist
    }
    throw error; // Some other error occurred
  }
};
