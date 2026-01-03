import { Octokit } from "@octokit/rest"

export function gh(token: string) {
    return new Octokit({ auth: token })
}

export async function listRunsForSha(o: Octokit, owner: string, repo: string, workflowId: number, sha: string, limit: number) {
    const res = await o.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id: workflowId,
        per_page: Math.min(100, Math.max(1, limit))
    })
    return res.data.workflow_runs.filter(r => r.head_sha === sha).slice(0, limit)
}

export async function createCheck(o: Octokit, owner: string, repo: string, sha: string, ok: boolean, summary: string) {
    await o.checks.create({
        owner,
        repo,
        name: "Flaky Detector",
        head_sha: sha,
        status: "completed",
        conclusion: ok ? "success" : "neutral",
        output: { title: "Flaky Detector", summary }
    })
}

export async function commentPR(o: Octokit, owner: string, repo: string, pr: number, body: string) {
    await o.issues.createComment({
        owner,
        repo,
        issue_number: pr,
        body
    })
}
