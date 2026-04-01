const config = require("./src/config.cjs");
const createApp = require("./src/app.cjs");

const app = createApp(config);

app.listen(config.port, () => {
  console.log(`server started at http://localhost:${config.port}`);
});
