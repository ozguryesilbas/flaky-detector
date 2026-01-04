import * as core from "@actions/core"
import * as github from "@actions/github"

type Conclusion = "success" | "failure" | "cancelled" | "skipped" | "neutral" | "timed_out" | "action_required" | "stale" | null

function toInt(v: string, fallback: number) {
    const n = Number.parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
}

async function run() {
    const token = core.getInput("token", { required: true })
    const window = toInt(core.getInput("window") || "20", 20)

    const ctx = github.context
    const { owner, repo } = ctx.repo

    const wr = (ctx.payload as any).workflow_run
    const workflowId = wr?.workflow_id as number | undefined

    if (!workflowId) {
        core.setFailed("workflow_run.workflow_id not found. This action must run on workflow_run.")
        return
    }

    const octokit = github.getOctokit(token)

    const { data } = await octokit.rest.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id: workflowId,
        per_page: Math.min(window, 100)
    })

    const conclusions = (data.workflow_runs || []).map(r => r.conclusion as Conclusion).filter(c => c !== null) as Exclude<Conclusion, null>[]

    const hasSuccess = conclusions.includes("success")
    const hasFailure = conclusions.includes("failure")
    const flaky = hasSuccess && hasFailure

    core.setOutput("flaky", String(flaky))

    core.summary
        .addHeading(flaky ? "⚠️ Flaky detected" : "✅ Not flaky")
        .addRaw(`Window: ${Math.min(window, conclusions.length)} runs`)
        .addBreak()
        .addRaw(`Seen: ${Array.from(new Set(conclusions)).join(", ") || "none"}`)
        .write()

    if (flaky) core.warning(`Flaky detected based on last ${Math.min(window, conclusions.length)} runs`)
}

run().catch(e => core.setFailed(e instanceof Error ? e.message : String(e)))
