import * as core from "@actions/core"
import * as github from "@actions/github"
import * as fs from "fs"
import * as path from "path"

const WINDOW_SIZE = 20

type Run = {
    conclusion: string
}

async function run() {
    const ctx = github.context
    const workflow = ctx.workflow
    const branch = ctx.ref.replace("refs/heads/", "")

    const workspace = process.env.GITHUB_WORKSPACE
    if (!workspace) return

    const cacheDir = path.join(workspace, ".flaky-cache")
    const cacheFile = path.join(cacheDir, "history.json")

    let history: Run[] = []

    if (fs.existsSync(cacheFile)) {
        try {
            history = JSON.parse(fs.readFileSync(cacheFile, "utf-8"))
        } catch {}
    }

    const conclusion =
        ctx.payload.workflow_run?.conclusion ??
            ctx.payload.conclusion

    if (!conclusion) return

    history.push({ conclusion })
    if (history.length > WINDOW_SIZE) history.shift()

    fs.mkdirSync(cacheDir, { recursive: true })
    fs.writeFileSync(cacheFile, JSON.stringify(history))

    const results = new Set(history.map(r => r.conclusion))
    const flaky = results.has("success") && results.has("failure")

    core.info(`History length: ${history.length}`)
    core.info(`History: ${JSON.stringify(history)}`)

    if (flaky) {
        core.warning(`Flaky detected based on last ${WINDOW_SIZE} runs`)
        core.summary
            .addHeading("⚠️ Flaky CI detected")
            .addRaw(`Mixed success and failure detected in the last ${WINDOW_SIZE} runs.`)
            .write()
    }
}

run()
