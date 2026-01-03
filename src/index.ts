import * as core from "@actions/core"
import * as github from "@actions/github"

const WINDOW_SIZE = 20

type Run = {
    sha: string
    conclusion: string
}

async function run() {
    const token = process.env.GITHUB_TOKEN as string
    const octokit = github.getOctokit(token)
    const ctx = github.context

    const workflow = ctx.workflow
    const branch = ctx.ref.replace("refs/heads/", "")
    const cacheKey = `flaky-${workflow}-${branch}`

    let history: Run[] = []

    try {
        const state = core.getState(cacheKey)
        if (state) history = JSON.parse(state)
    } catch {}

    const conclusion = ctx.payload.workflow_run?.conclusion
    const sha = ctx.sha

    if (!conclusion) return

    history.push({ sha, conclusion })
    if (history.length > WINDOW_SIZE) history.shift()

    const results = new Set(history.map(r => r.conclusion))
    const flaky = results.has("success") && results.has("failure")

    await core.saveState(cacheKey, JSON.stringify(history))

    if (flaky) {
        core.warning(`Flaky detected based on last ${WINDOW_SIZE} runs`)
        core.summary
            .addHeading("⚠️ Flaky CI detected")
            .addRaw(`Mixed success/failure detected in the last ${WINDOW_SIZE} runs.`)
            .write()
    } else {
        core.info("No flakiness detected")
    }
}

run()
