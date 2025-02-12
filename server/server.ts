Bun.serve({
  // 3819 meaning "chai" as in chainference.
  port: 3819,
  fetch(req) {
    return new Response("all good");
  },
});
