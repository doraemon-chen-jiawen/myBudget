const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");

const healthRoute = require("./routes/health");
const authRoute = require("./routes/auth");
const budgetsRoute = require("./routes/budgets");
const recordsRoute = require("./routes/records");
const bankAccountsRoute = require("./routes/bank-accounts");
const financeAccountsRoute = require("./routes/finance-accounts");
const familyGroupsRoute = require("./routes/family-groups");
const autoFillRoute = require("./routes/auto-fill");
const familyRoute = require("./routes/family");
const homeRoute = require("./routes/home");
const budgetCategoriesRoute = require("./routes/budget-categories");
const incomeCategoriesRoute = require("./routes/income-categories");
const incomeBudgetsRoute = require("./routes/income-budgets");
const statisticsRoute = require("./routes/statistics");
const invitationRoute = require("./routes/invitation");
const familyManagementRoute = require("./routes/family-management");
const backfillRoute = require("./routes/backfill");
const beadRoute = require("./routes/bead");
const { notFoundHandler, errorHandler } = require("./middleware/error-handler");

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(morgan("dev"));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "myBudget backend is ready"
  });
});

app.use("/api/health", healthRoute);
app.use("/api/auth", authRoute);
app.use("/api/budgets", budgetsRoute);
app.use("/api/budget-categories", budgetCategoriesRoute);
app.use("/api/income-categories", incomeCategoriesRoute);
app.use("/api/income-budgets", incomeBudgetsRoute);
app.use("/api/records", recordsRoute);
app.use("/api/bank-accounts", bankAccountsRoute);
app.use("/api/finance-accounts", financeAccountsRoute);
app.use("/api/family-groups", familyGroupsRoute);
app.use("/api/auto-fill", autoFillRoute);
app.use("/api/family", familyRoute);
app.use("/api/home", homeRoute);
app.use("/api/statistics", statisticsRoute);
app.use("/api/backfill", backfillRoute);
app.use("/api/invitations", invitationRoute);
app.use("/api/family-management", familyManagementRoute);
app.use("/api/bead", beadRoute);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
