const https = require('https');

function testUrl(url) {
    console.log(`\nTesting URL: ${url}`);
    return new Promise((resolve) => {
        const req = https.get(url, (res) => {
            console.log(`STATUS: ${res.statusCode}`);
            console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log(`BODY LENGTH: ${body.length}`);
                console.log(`BODY: ${body}`);
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`ERROR: ${e.message}`);
            resolve();
        });
        req.end();
    });
}

async function run() {
    await testUrl('https://www.triageflow.me/api/specialty');
    await testUrl('https://www.triageflow.me/api/doctor');
}

run();
