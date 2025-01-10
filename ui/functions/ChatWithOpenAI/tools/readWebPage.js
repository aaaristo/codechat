module.exports = {
  type: "function",
  function: {
    name: "readWebPage",
    description:
      "Allows to read the content of a web page by providing the URL",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL of the web page to read the content from",
        },
      },
      required: ["url"],
    },
  },
  resolver: async (args) => {
    const { url } = args;

    console.log("readWebPage", url);

    const fetch = (await import("node-fetch")).default;

    const response = await fetch(url);

    if (!response.ok) {
      return `Error reading web page: ${response.statusText}`;
    }

    const content = await response.text();

    return content;
  },
};
