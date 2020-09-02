import * as core from '@actions/core'
import { Stockpile, Client } from 'gh-stockpile'

async function copy() {
    const src = core.getInput('src')
    const dest = core.getInput('dest')
    const ttl = core.getInput('ttl')
    const ifNotFound = core.getInput('if-not-found')

    let client: Client | undefined = undefined
    let blobName: string | undefined = undefined
    let filePath: string | undefined = undefined

    if (src.indexOf("://")) {
        console.log(`Src: ${src}`)
        client = Stockpile.createClient(src)
        blobName = Stockpile.getBlobName(src)
        filePath = dest
    } else if (dest.indexOf("://")) {
        console.log(`Dest: ${dest}`)
        client = Stockpile.createClient(dest)
        blobName = Stockpile.getBlobName(dest)
        filePath = src
    }

    if (!client || !blobName || !filePath) {
        throw Error(`src or dest must reference a storage account from a supported provider`)
    }

    try {
        if (filePath === src) {
            await client.createContainerIfNotExists()
            await client.uploadFile(filePath, blobName, {
                ttl: ttl === "" ? undefined : ttl
            })
        } else {
            await client.downloadFile(blobName, filePath)
        }
    } catch (error) {
        core.setOutput("successful", "false")

        if (error.statusCode && error.statusCode == 404 && ifNotFound === 'skip') {
            return
        }

        throw error
    }

    core.setOutput("successful", "true")
}

copy().catch((e) => core.error(e))