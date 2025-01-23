const staticDir = "./build";

const server = Bun.serve({
  fetch: (req) => {
    const url = new URL(req.url);
    const path = `${staticDir}${
      url.pathname === "/" ? "/index.html" : url.pathname
    }`;

    if (Bun.file(path).size > 0) {
      return new Response(Bun.file(path));
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Listening on http://localhost:${server.port} ...`); 