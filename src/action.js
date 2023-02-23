const core = require('@actions/core')
const {initSdk} = require('./init')
const {
    REQUIRED,
    ENVIRONMENT_STATUS_MAX_WAIT_SECONDS, ENVIRONMENT_STATUS_DELAY_WAIT_SECONDS
} = require('./constants')
const halfred = require("halfred");
const {rels} = require("@adobe/aio-lib-cloudmanager/src/constants");
const {codes} = require("@adobe/aio-lib-cloudmanager/src/SDKErrors");

async function createRDEEnvironment(programId, environmentName) {
    core.info('Creating environment in program: ' + programId + ' with name: ' + environmentName);

    //create RDE environment
    let sdk;
    try {
        sdk = await initSdk();
        core.info('CM SDK initialized');
    } catch (e) {
        core.setFailed(e.message)
        return
    }

    let environment = await getEnvironmentByName(sdk, programId, environmentName);

    if (environment) {
        core.info(`Environment ${environmentName} already exists.`)
        core.setOutput('created', false)

        if (environment.status === 'deleting') {
            core.info(`Environment ${environmentName} is in deleting state. Cannot create it. Please wait for deletion to finish then try again.`)
            core.error('Environment ${environmentName} is in deleting state')
            core.setFailed('Environment ${environmentName} is in deleting state')
        }
    } else {
        core.info('Environment does not exist. Creating it..');

        const password = generatePassword();

        const program = await sdk._findProgram(programId)
        const environmentsHref = halfred.parse(program).link(rels.environments).href
        //trying to use https://developer.adobe.com/experience-cloud/cloud-manager/reference/api/#tag/Environments/operation/createEnvironment
        await sdk._post(environmentsHref, {
                name: environmentName,
                type: "rde",
                region: "va7",
                description: `Autocreated PR Validation RDE Environment ` + environmentName,
                adminPassword: password
            },
            codes.ERROR_GET_PROGRAM)

        environment = await getEnvironmentByName(sdk, programId, environmentName);
        core.info(`Environment ${environment.name} created with environmentId=${environment.id}. Will wait for environment to be ready..`)
        core.setSecret(password)
        core.setOutput('adminPassword', password)
        core.setOutput('created', true)
    }

    await waitForEnvironmentReadyStatus(sdk, programId, environment.id)


    environment = await getEnvironmentByName(sdk, programId, environmentName)

    core.info('environmentId: ' + environment.id)
    core.info('environmentName: ' + environment.name)
    core.info('environmentType: ' + environment.type)
    core.info('environmentDescription: ' + environment.description);
    core.info('Author URL: ' + environment._links["http://ns.adobe.com/adobecloud/rel/author"][0].href);
    core.info('Publish URL: ' + environment._links["http://ns.adobe.com/adobecloud/rel/publish"][0].href);
    core.info('Developer Console: ' + environment._links["http://ns.adobe.com/adobecloud/rel/developerConsole"][0].href);

    const program = await getProgramById(sdk, programId)

    core.setOutput('programId', programId)
    core.setOutput('programName', program.name)
    core.setOutput('tenantId', program.tenantId)

    core.setOutput('environmentId', environment.id)
    core.setOutput('environmentName', environment.name)
    core.setOutput('environmentType', environment.type)
    core.setOutput('environmentDescription', environment.description)
    core.setOutput('authorUrl', environment._links["http://ns.adobe.com/adobecloud/rel/author"][0].href)
    core.setOutput('publishUrl', environment._links["http://ns.adobe.com/adobecloud/rel/publish"][0].href)
    core.setOutput('developerConsoleUrl', environment._links["http://ns.adobe.com/adobecloud/rel/developerConsole"][0].href)
    core.setOutput('manageEnvironmentUrl', `https://experience.adobe.com/#/@${program.tenantId}/cloud-manager/environments.html/program/${environment.programId}/environment/${environment.id}`)

    core.info(`Environment ${environmentName} ready for use.`)
}

async function deleteRDEEnvironment(programId, environmentName) {
    //delete RDE environment
    const sdk = await initSdk();

    let environment = await getEnvironmentByName(sdk, programId, environmentName);

    if (!environment) {
        core.info(`Environment ${environmentName} not found. No need to delete it.`)
        return
    }

    if (environment.status === 'deleting') {
        core.info(`Environment ${environmentName} already in deleting state. Skipping deletion.`)
        return
    }

    if (environment.status === 'creating') {
        core.info(`Environment ${environmentName} is in creating state. Waiting for it to become ready first..`)
        await waitForEnvironmentReadyStatus(sdk, programId, environment.id)
    }

    try {
        core.info('Deleting environment ...')
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

async function getEnvironmentStatus(sdk, programId, environmentId) {
    const environments = await sdk.listEnvironments(programId);
    //list the environments
    for (const environment of environments) {
        if (environment.id === environmentId) {
            return environment.status
        }
    }
    return null
}

async function getEnvironmentByName(sdk, programId, environmentName) {
    const environments = await sdk.listEnvironments(programId);
    //list the environments
    for (const environment of environments) {
        if (environment.name === environmentName) {
            return environment
        }
    }
    return null
}

async function getProgramById(sdk, programId) {
    const programs = await sdk.listPrograms();
    //list the environments
    for (const program of programs) {
        if (program.id === programId) {
            return program
        }
    }
    return null
}



// async function getEnvironmentById(sdk, programId, environmentId) {
//     const environments = await sdk.listEnvironments(programId);
//     //list the environments
//     for (const environment of environments) {
//         if (environment.id === environmentId) {
//             return environment
//         }
//     }
//     return null
// }

async function waitForEnvironmentReadyStatus(sdk, programId, environmentId) {
    core.startGroup('Waiting for Environment to be ready...')
    const delay = async (ms = 10000) => new Promise(resolve => setTimeout(resolve, ms))
    let attempts = 0;

    while (attempts < ENVIRONMENT_STATUS_MAX_WAIT_SECONDS / ENVIRONMENT_STATUS_DELAY_WAIT_SECONDS) {

        const status = await getEnvironmentStatus(sdk, programId, environmentId)

        if (status === 'ready' || status === 'updating') {
            core.endGroup()
            core.info('Environment is ready.')
            return
        }

        if (status === 'failed') {
            core.endGroup()
            core.error('Environment creation failed.')
            throw new Error('Environment creation failed.')
        }

        core.info(`Found Environment Status: ${status}`)
        await delay()
    }

    core.endGroup()
    core.error('Environment creation timed out.')
    throw new Error('Environment creation timed out.')
}


const crypto = require('crypto')

const generatePassword = (
    length = 20,
    wishlist = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$'
) =>
    Array.from(crypto.randomFillSync(new Uint32Array(length)))
        .map((x) => wishlist[x % wishlist.length])
        .join('')


module.exports = {
    executeAction
}
