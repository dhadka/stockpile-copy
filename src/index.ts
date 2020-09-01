import * as core from '@actions/core'
import * as url from 'url'
import { AzureStorageConfiguration, AzureStorageClient } from 'gh-stockpile'

async function copy() {
    const src = core.getInput('src')
    const dest = core.getInput('dest')
    const ttl = core.getInput('ttl')
    const ifNotFound = core.getInput('if-not-found')

    let accountName: string | undefined = undefined
    let containerName: string | undefined = undefined
    let blobName: string | undefined = undefined
    let filePath: string | undefined = undefined
    let sasToken = process.env["SAS_TOKEN"]

    if (src.startsWith("http://") || src.startsWith("https://")) {
        const srcUrl = url.parse(src)
        accountName = srcUrl.host?.substring(0, srcUrl.host.indexOf('.'))
        containerName = srcUrl.path?.substring(1, srcUrl.path.indexOf('/', 1))
        blobName = srcUrl.path?.substring(2 + (containerName?.length ?? 0))
        filePath = dest
    }

    if (dest.startsWith("http://") || dest.startsWith("https://")) {
        const destUrl = url.parse(dest)
        accountName = destUrl.host?.substring(0, destUrl.host.indexOf('.'))
        containerName = destUrl.path?.substring(1, destUrl.path.indexOf('/', 1))
        blobName = destUrl.path?.substring(2 + (containerName?.length ?? 0))
        filePath = src
    }

    core.info(`Account: ${accountName}, Container: ${containerName}, Blob: ${blobName}`)

    if (!accountName) {
        core.error("Missing account name")
        return
    }

    if (!containerName) {
        core.error("Missing container name")
        return
    }

    if (!blobName) {
        core.error("Missing blob name")
        return
    }

    if (!sasToken) {
        core.error("Missing SAS token")
        return
    }

    if (!filePath) {
        core.error("Missing local file path")
        return
    }

    let configuration = new AzureStorageConfiguration(accountName, containerName, sasToken)
    let client = new AzureStorageClient(configuration)

    try {
        if (filePath === src) {
            await client.createContainerIfNotExists()
            await client.uploadFile(filePath, blobName)
        } else {
            await client.downloadFile(blobName, filePath)
        }
    } catch (error) {
        core.setOutput("successful", "false")

        if (error.response && error.response.statusCode == 404 && ifNotFound === 'skip') {
            return
        }

        throw error
    }

    core.setOutput("successful", "true")
}

copy().catch((e) => core.error(e))