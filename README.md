# aio-cloudmanager-rde-action

GitHub action that can create or delete an RDE Environment.

It uses [https://github.com/adobe/aio-cli-plugin-aem-rde](https://github.com/adobe/aio-cli-plugin-aem-rde) as a starting point.

## Authentication

To use this action, you must create aan integration must be created in the [Adobe I/O Developer Console](https://console.adobe.io) which has the Cloud Manager service. See the [Cloud Manager API Documentation](https://www.adobe.io/experience-cloud/cloud-manager/guides/getting-started/create-api-integration/) for more information.

## Configuration

* `IMSCONFIG` - IMS config JSON object containing `client_id`, `client_secret`, `technical_account_id`, `ims_org_id`, `meta_scopes`, and `private_key`

**or**

* `CLIENTID` - Client ID for the project in the I/O Developer Console
* `CLIENTSECRET` - Client Secret for the project in the I/O Developer Console
* `TECHNICALACCOUNTID` - Technical Account Email for the project in the I/O Developer Console
* `IMSORGID` - IMS Organization ID for the project in the I/O Developer Console
* `KEY` - Private key for the project in the I/O Developer Console
* `programId` - Cloud Manager Program ID
* `environmentName` - Cloud Manager environment name
* `environmentDescription` - Cloud Manager environment description
* `action` - Action to perform. Can be `create` or `delete`
* `wait` - Wait for the action to finish before exiting. Default is `true`

```
- name: Create Execution
  uses: adobe-basel/aio-cloudmanager-rde-action@v1.0.0
  with:
    CLIENTID: ${{ secrets.CM_CLIENT_ID }}
    CLIENTSECRET: ${{ secrets.CM_CLIENT_SECRET }}
    TECHNICALACCOUNTID: ${{ secrets.CM_TA_EMAIL }}
    IMSORGID: ${{ secrets.CM_ORG_ID }}
    KEY: ${{ secrets.CM_PRIVATE_KEY }}
    programId: 12345
    environmentName: "RDE-PR23"
    environmentDescription: "Autoprovisioned validation environment for https://github.com/adobe-basel/aem-customer-repo-dxp/pull/1"
    action: "create"
    wait: "true"
```

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
