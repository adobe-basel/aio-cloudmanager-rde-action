const core = require('@actions/core')

const {context, getToken} = require('@adobe/aio-lib-ims')
const {init} = require('@adobe/aio-lib-cloudmanager')
const {REQUIRED} = require('./constants')

const CONTEXT = 'aio-cloudmanager-github-actions'
const SCOPE = 'ent_cloudmgr_sdk'

async function initSdk() {
    const baseUrl = core.getInput('baseUrl', REQUIRED)

    let imsConfig = core.getInput('imsConfig')
    let apiKey
    let imsOrgId
    let imsConfigJson

    if (imsConfig === '') {
        apiKey = core.getInput('clientId')
        imsOrgId = core.getInput('imsOrgId')

        const key = core.getInput('key', REQUIRED)
        const clientSecret = core.getInput('clientSecret', REQUIRED)
        const techAccId = core.getInput('technicalAccountId', REQUIRED)

        imsConfigJson = {
            client_id: apiKey,
            client_secret: clientSecret,
            technical_account_id: techAccId,
            ims_org_id: imsOrgId,
            private_key: key.toString(),
            meta_scopes: [
                SCOPE
            ]
        }
    } else {
        imsConfigJson = JSON.parse(imsConfig)

        apiKey = imsConfigJson.client_id
        imsOrgId = imsConfigJson.ims_org_id
    }

    core.info(`IMS config: ${JSON.stringify(imsConfigJson)}`)

    await context.set(CONTEXT, imsConfigJson, true)
    const accessToken = await getToken(CONTEXT)

    return await init(imsOrgId, apiKey, accessToken, baseUrl)
}

module.exports = {
    initSdk
}
