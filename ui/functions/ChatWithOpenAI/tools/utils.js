const { resolve } = require("path");

const OUTDIR = process.env.CODECHAT_OUTPUT_FOLDER || ".";
const RESOLVED_OUTDIR = resolve(OUTDIR);

exports.assertInOutputDir = (path) => {
  const resolvedPath = resolve(OUTDIR, path);

  if (!resolvedPath.startsWith(RESOLVED_OUTDIR)) {
    throw new Error(`Path must be inside the output directory: ${OUTDIR}`);
  }

  return resolvedPath;
};
