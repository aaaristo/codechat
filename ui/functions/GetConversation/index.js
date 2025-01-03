const fs = require("fs");

const OUTDIR = process.env.OUTDIR;
const MODEL = "gpt-4o"; // or gpt-4-0613

if (!OUTDIR) {
  throw new Error("OUTDIR environment variable is required");
}

if (!fs.existsSync(OUTDIR)) {
  fs.mkdirSync(OUTDIR, { recursive: true });
}

const conversationPath = `${OUTDIR}/conversation.json`;

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
          !msg.tools_call &&
          msg.content
      )
      .map((msg) => ({
        user: msg.role === "user" ? "You" : "AI",
        message: msg.role === "user" ? msg.content[0].text : msg.content,
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
