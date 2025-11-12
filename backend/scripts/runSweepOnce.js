#!/usr/bin/env node
const { runSweep } = require('../utils/dailystatsSweep');

(async () => {
  try {
    const res = await runSweep({ dryRun: false, batchSize: 1000 });
    console.log('Sweep result:', res);
    process.exit(0);
  } catch (e) {
    console.error('Sweep failed:', e && e.message ? e.message : e);
    process.exit(2);
  }
})();
