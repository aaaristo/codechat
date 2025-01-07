const { resolve } = require("path");

exports.assertInOutputDir = (path) => {
  const resolvedPath = resolve(OUTDIR, path);

  if (!resolvedPath.startsWith(RESOLVED_OUTDIR)) {
    throw new Error(`Path must be inside the output directory: ${OUTDIR}`);
  }

  return resolvedPath;
};
