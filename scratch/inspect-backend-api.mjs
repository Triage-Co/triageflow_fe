async function checkEndpoints() {
    const candidates = [
        '/api/docs-json',
        '/api-docs-json',
        '/docs-json',
        '/swagger.json',
        '/api/swagger.json',
        '/api/openapi.json',
        '/v3/api-docs',
        '/api-docs/swagger.json',
        '/api/ticket',
        '/api/booking',
        '/api/queue',
        '/api/flow'
    ];

    for (const path of candidates) {
        try {
            const r = await fetch('https://triageflow.me' + path);
            console.log(`${path} -> HTTP ${r.status}`);
            if (r.status === 200) {
                const json = await r.json();
                if (json.paths) {
                    console.log(`FOUND SWAGGER PATHS at ${path}:`);
                    const ticketPaths = Object.keys(json.paths).filter(p => 
                        p.includes('ticket') || p.includes('reissue') || p.includes('booking') || p.includes('queue') || p.includes('patient')
                    );
                    console.log(ticketPaths);
                } else if (Array.isArray(json) || typeof json === 'object') {
                    console.log(`JSON response sample at ${path}:`, JSON.stringify(json).slice(0, 150));
                }
            }
        } catch (e) {
            console.log(`${path} -> ERR ${e.message}`);
        }
    }
}

checkEndpoints();
