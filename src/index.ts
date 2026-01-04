import * as core from "@actions/core"
import * as github from "@actions/github"

const WINDOW_SIZE = 20

async function run() {
    const ctx = github.context

    const runs = ctx.payload.workflow_run?.pull_requests
        ? []
        : ctx.payload.workflow_run

    const history = ctx.payload.workflow_run?.head_commit
        ? []
        : []

    const recent = ctx.payload.workflow_run?.conclusion
    if (!recent) return

    const conclusions = ctx.payload.workflow_run?.repository
        ? []
        : []

    const seen = new Set<string>()

    const runsData = ctx.payload.workflow_run?.repository?.workflow_runs || []

    for (const r of runsData.slice(0, WINDOW_SIZE)) {
        if (r.conclusion) seen.add(r.conclusion)
    }

    if (seen.has("success") && seen.has("failure")) {
        core.warning(`Flaky detected based on last ${WINDOW_SIZE} runs`)
        core.summary
            .addHeading("⚠️ Flaky CI detected")
            .addRaw(`Mixed success and failure detected in the last ${WINDOW_SIZE} runs.`)
            .write()
    }
}

run()
