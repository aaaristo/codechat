const fs = require("fs");
const { formatToolCalls } = require("../utils");

const OUTDIR = process.env.CODECHAT_OUTPUT_FOLDER || ".";

if (!OUTDIR) {
  throw new Error("OUTDIR environment variable is required");
}

if (!fs.existsSync(OUTDIR)) {
  fs.mkdirSync(OUTDIR, { recursive: true });
}

const conversationPath = `${OUTDIR}/codechat.json`;

exports.handler = async (event) => {
  try {
    let conversation = [];
    if (fs.existsSync(conversationPath)) {
      const fileContent = fs.readFileSync(conversationPath, "utf-8");
      conversation = JSON.parse(fileContent);
    }

    conversation = conversation
      .filter(
        (msg) =>
          msg.role !== "system" &&
          msg.role !== "function" &&
          msg.role !== "tool" &&
          (msg.content || msg.tool_calls)
      )
      .map((msg) => ({
        user: msg.role === "user" ? "You" : "AI",
        message: msg.role === "user" ? msg.content[0].text : msg.content,
        tool_calls: formatToolCalls(msg.tool_calls),
      }));

    return {
      statusCode: 200,
      body: JSON.stringify({ conversation }),
    };
  } catch (error) {
    console.error(
      "Error in contacting OpenAI API or handling local files:",
      error.message
    );
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
