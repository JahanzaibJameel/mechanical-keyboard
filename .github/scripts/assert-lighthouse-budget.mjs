#!/usr/bin/env node
// Asserts the Lighthouse budget from the JSON reports in a directory.
//
// Lighthouse's own exit code is not a reliable gate: on Windows it exits non-zero
// with EPERM while failing to delete its temporary Chrome profile, after the
// report has already been written. The presence and content of the report files
// is the signal, so that is what this script checks.
//
// Usage: node .github/scripts/assert-lighthouse-budget.mjs <report-dir>

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BUDGETS = {
  "categories:performance": 0.75,
  "categories:accessibility": 1,
  "categories:seo": 0.95,
  "categories:best-practices": 0.75,
};

const reportDir = process.argv[2] ?? ".lighthouse-ci";

let files;
try {
  files = readdirSync(reportDir)
    .filter((name) => name.endsWith(".json"))
    .sort();
} catch {
  console.error(`No report directory at ${reportDir}. Lighthouse produced no output.`);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`No JSON reports in ${reportDir}. Lighthouse produced no output.`);
  process.exit(1);
}

const reports = files.map((name) => {
  const report = JSON.parse(readFileSync(join(reportDir, name), "utf8"));
  const scores = Object.fromEntries(
    Object.keys(report.categories).map((key) => [key, report.categories[key].score]),
  );
  const metrics = report.audits?.metrics?.details?.items?.[0] ?? {};
  return {
    name,
    scores,
    lcp: metrics.largestContentfulPaint,
    tbt: metrics.totalBlockingTime,
    cls: metrics.cumulativeLayoutShift,
    consoleErrors: report.audits?.["errors-in-console"]?.score,
  };
});

// Average the two middle values for an even run count. Taking
// sorted[floor(n / 2)] instead would return the upper middle element and
// overstate the median for any even number of runs.
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length / 2;
  return sorted.length % 2 === 1
    ? sorted[Math.floor(middle)]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

console.log(`Lighthouse budget over ${reports.length} run(s) from ${reportDir}\n`);
for (const report of reports) {
  const fmt = (value) => (typeof value === "number" ? value.toFixed(2) : "n/a");
  console.log(
    `  ${report.name.padEnd(20)} perf=${fmt(report.scores.performance)} ` +
      `a11y=${fmt(report.scores.accessibility)} bp=${fmt(report.scores["best-practices"])} ` +
      `seo=${fmt(report.scores.seo)} lcp=${Math.round(report.lcp)}ms tbt=${Math.round(report.tbt)}ms cls=${report.cls}`,
  );
}

// Single-run variance on shared runners is roughly +/-0.1 on Performance, so the
// gate is the median rather than the minimum.
const observed = Object.fromEntries(
  Object.keys(BUDGETS).map((key) => [
    key,
    median(reports.map((report) => report.scores[key.replace("categories:", "")])),
  ]),
);

console.log("\nMedian against budget:");
const failures = [];
for (const [key, minimum] of Object.entries(BUDGETS)) {
  const actual = observed[key];
  const pass = typeof actual === "number" && actual >= minimum;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${key} = ${actual} (minimum ${minimum})`);
  if (!pass) failures.push(`${key} = ${actual}, minimum ${minimum}`);
}

// A console error means a hydration mismatch or a runtime throw, both of which
// the Best Practices score only partly reflects.
const badConsole = reports.filter((report) => report.consoleErrors !== 1);
if (badConsole.length > 0) {
  failures.push(
    `errors-in-console scored ${badConsole.map((r) => `${r.name}=${r.consoleErrors}`).join(", ")}; expected 1`,
  );
}

if (failures.length > 0) {
  console.error(`\nLighthouse budget failed:\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}

console.log("\nLighthouse budget met.");