exports.formatToolCalls = (tool_calls) =>
  tool_calls?.map((x) => {
    const arguments = JSON.parse(x.function.arguments);
    delete arguments.content;

    return {
      ...x,
      function: {
        ...x.function,
        arguments,
      },
    };
  });
