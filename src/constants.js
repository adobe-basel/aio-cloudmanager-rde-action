module.exports = {
    REQUIRED: {
        required: true
    },
    ENVIRONMENT_STATUS_READY: ['ready', 'updating', 'created'],
    ENVIRONMENT_STATUS_BROKEN: ['failed', 'restore_failed'],
    ENVIRONMENT_STATUS_MAX_WAIT_SECONDS: 5 * 60, // 5 minutes
    ENVIRONMENT_STATUS_DELAY_WAIT_SECONDS: 10,
    FINISHED: 'FINISHED'
}
