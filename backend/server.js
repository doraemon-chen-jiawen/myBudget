const app = require("./src/app");
const env = require("./src/config/env");
const { checkDatabaseConnection } = require("./src/config/db");

async function bootstrap() {
  try {
    await checkDatabaseConnection();
    console.log("[DB] MySQL connected");

    app.listen(env.port, () => {
      console.log(`[HTTP] Server running at http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error("[BOOTSTRAP_ERROR]", error.message);
    process.exit(1);
  }
}



bootstrap();
