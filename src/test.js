// const wait = require('./wait');
const process = require('process');
const cp = require('child_process');
const path = require('path');

// test('throws invalid number', async () => {
//   await expect(wait('foo')).rejects.toThrow('milliseconds not a number');
// });

// test('wait 500 ms', async () => {
//   const start = new Date();
//   //await wait(500);
//   const end = new Date();
//   var delta = Math.abs(end - start);
//   expect(delta).toBeGreaterThanOrEqual(500);
// });

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
    process.env['INPUT_MILLISECONDS'] = 100;
    process.env['INPUT_ACTION'] = "create";
    process.env['INPUT_PROGRAMID'] = "0";
    process.env['INPUT_ENVIRONMENTNAME'] = "PR_1";
    const ip = path.join(__dirname, 'index.js');
    try {
        const result = cp.execSync(`node ${ip}`, {env: process.env}).toString();

        console.log(result);
    } catch (e) {
        console.log(e);
    }
})
