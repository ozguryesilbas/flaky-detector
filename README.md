# Flaky Detector

Flaky Detector is a GitHub Action that detects flaky CI behavior by analyzing
the results of the last 20 workflow runs.

If both `success` and `failure` outcomes are observed within this window,
the workflow is marked as flaky.

## What it does
- Tracks recent workflow results
- Uses a sliding window of the last 20 runs
- Detects inconsistent CI behavior
- Adds warnings and a job summary

## Why it matters
Flaky CI pipelines waste developer time and reduce trust in test results.
This action automatically flags unstable behavior without configuration.

## Usage

```yaml
- uses: ozguryesilbas/flaky-detector@v1
