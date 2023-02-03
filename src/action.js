const core = require('@actions/core')
const {initSdk} = require('./init')
const {
    REQUIRED, ENVIRONMENT_STATUS_READY, ENVIRONMENT_STATUS_BROKEN,
    ENVIRONMENT_STATUS_MAX_WAIT_SECONDS, ENVIRONMENT_STATUS_DELAY_WAIT_SECONDS
} = require('./constants')
const halfred = require("halfred");
const {rels} = require("@adobe/aio-lib-cloudmanager/src/constants");

async function createRDEEnvironment(programId, environmentName) {
    core.info('Creating environment in program: ' + programId + ' with name: ' + environmentName);

    //create RDE environment
    const sdk = await initSdk();
    const environments = sdk.listEnvironments(programId);
    const existingEnvironment = environments.find(e => e.name === environmentName)
    if (existingEnvironment) {
        core.setOutput(`Environment ${environmentName} already exists. Skipping creation.`)
        await checkEnvironmentStatus(sdk, programId, existingEnvironment.id)
        return
    }


    const program = sdk._getProgram(programId)
    const environmentsHref = halfred.parse(program).link(rels.environments).href
    //trying to use https://developer.adobe.com/experience-cloud/cloud-manager/reference/api/#tag/Environments/operation/createEnvironment
    const environment = await sdk._post(environmentsHref, {
        name: environmentName
    })


    const environmentId = environment.id
    core.setOutput(`Environment creation for environmentId:${environmentId} started. Will wait for environment to be ready.`)
    await checkEnvironmentStatus(sdk, programId, environmentId)

    core.setOutput('environmentId', environment.id)
    core.setOutput('environmentName', environment.name)
    core.setOutput('environmentType', environment.type)
    core.setOutput('environmentDescription', environment.description);

    core.summary.write(`Environment ${environmentName} created`).write()

}

async function deleteRDEEnvironment(programId, environmentName) {
    //delete RDE environment
    const sdk = await initSdk();

    const environments = sdk.listEnvironments(programId);
    const environment = environments.find(e => e.name === environmentName)
    if (!environment) {
        core.setFailed(`Environment ${environmentName} not found`)
        return
    }

    try {
        core.info('Deleting RDE ...')
        await sdk.deleteEnvironment(programId, environment.id)
        core.info(`Environment ${environmentName} deletion requested`)
    } catch (e) {
        core.error('Error deleting environment', e)
        core.setFailed(e)
    }
}


async function executeAction() {
    const action = core.getInput('action', REQUIRED)
    const programId = core.getInput('programId', REQUIRED)
    const environmentName = core.getInput('environmentName', REQUIRED)

    //create or delete RDE environment
    if (action === 'create') {
        //create RDE environment
        createRDEEnvironment(programId, environmentName);
    } else if (action === 'delete') {
        deleteRDEEnvironment(programId, environmentName);
    } else {
        core.setFailed(`Action ${action} not supported`)
    }
}

async function checkEnvironmentStatus(sdk, programId, environmentId) {
    const delay = async (ms = 10000) => new Promise(resolve => setTimeout(resolve, ms))
    let status = null;
    let attempts = 0;

    while (
        !ENVIRONMENT_STATUS_READY.includes(status) &&
        !ENVIRONMENT_STATUS_BROKEN.includes(status) &&
        attempts < ENVIRONMENT_STATUS_MAX_WAIT_SECONDS / ENVIRONMENT_STATUS_DELAY_WAIT_SECONDS) {

        core.info('Checking Environment status...')

        //no such method unfortunately.
        //TODO: implement it
        // api https://developer.adobe.com/experience-cloud/cloud-manager/reference/api/#tag/Environments/operation/getEnvironment
        const environment = await sdk.getEnvironment(programId, environmentId)
        status = environment.status

        core.info(`Environment Status: ${status}`)

        await delay()
    }

    if (ENVIRONMENT_STATUS_READY.includes(status)) {
        core.info('Environment is ready.')
    } else {
        core.setFailed('Environment creation failed or timed out.')
    }

    return status
}

module.exports = {
    executeAction
}
