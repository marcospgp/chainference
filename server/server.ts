Bun.serve({
  port: 3819, // Meaning "chai" as in chainference.
  fetch(req) {
    return new Response("all good");
  },
});
