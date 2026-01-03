import express from "express"
import { gh, listRunsForSha, createCheck, commentPR } from "./github.js"

const app = express()
app.use(express.json())

const port = Number(process.env.PORT || 3000)
const token = process.env.GITHUB_TOKEN || ""
const lookback = Number(process.env.LOOKBACK || 10)

function isFlaky(conclusions: (string | null)[]) {
    const set = new Set(conclusions.filter(Boolean) as string[])
    return set.has("success") && (set.has("failure") || set.has("cancelled") || set.has("timed_out") || set.has("action_required"))
}

app.post("/webhook", async (req, res) => {
    const event = String(req.headers["x-github-event"] || "")
    if (event !== "workflow_run") return res.sendStatus(200)
    if (!token) return res.sendStatus(500)

    const action = req.body.action
    if (action !== "completed") return res.sendStatus(200)

    const wr = req.body.workflow_run
    const prs = (wr.pull_requests || []) as Array<{ number: number }>
    if (!prs.length) return res.sendStatus(200)

    const owner = wr.repository.owner.login as string
    const repo = wr.repository.name as string
    const sha = wr.head_sha as string
    const workflowId = Number(wr.workflow_id)

    const o = gh(token)
    const runs = await listRunsForSha(o, owner, repo, workflowId, sha, lookback)
    const conclusions = runs.map(r => r.conclusion as string | null)

    if (isFlaky(conclusions)) {
        const prNumber = prs[0].number
        const summary = `Flaky signal: same commit has mixed outcomes in last ${runs.length} runs`
        await createCheck(o, owner, repo, sha, false, summary)
        await commentPR(
            o,
            owner,
            repo,
            prNumber,
            `⚠️ Flaky detected\n\n${summary}\n\nCheck timing, async usage, shared state, and external dependencies.`
        )
    } else {
        await createCheck(o, owner, repo, sha, true, `No flakiness detected in last ${runs.length} runs`)
    }

    res.sendStatus(200)
})

app.listen(port)
