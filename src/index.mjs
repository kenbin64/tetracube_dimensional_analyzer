// index.mjs — the public surface another agent imports. Everything here is DETERMINISTIC: no model in
// the loop, no network, same input to the same output every run. That is the point. You can analyze
// tasks that were built to stymie AI without trusting an AI to do the analyzing.

// The task-description analyzer (the reason another project pulls this in).
export { analyzeTask, taskReport } from './taskanalyzer.mjs';
export { lintDynamoTask, dynamoLintReport, crossFileChecks, auditDynamoTask } from './dynamotask.mjs';
export { CREASES, stumpScore, proposeStumps, adversaryPrompt, stumpReport } from './stumpsmith.mjs';

// The engine underneath: store the generator, derive the field. Lossless rule + residual.
export { seed, bloom, seedBest, shaSeq, structureScore } from './seedbloom.mjs';

// Structural analysis of source, and the file-type + adoption guard.
export { analyze as analyzeCss, reorganize } from './css-analyzer.mjs';
export { classify, adopt, skipByContent } from './policy.mjs';

// Self-verifying capsules and the base record<->point mapping.
export { pack, verify, ratio, sha256Bytes } from './capsule.mjs';
export { recordToPoint, pointToRecord, sha, canonical } from './dim.mjs';
