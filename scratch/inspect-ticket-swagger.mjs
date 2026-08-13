import fetch from 'node-fetch';

async function inspectTicketDocs() {
    const res = await fetch('https://triageflow.me/api-docs-json');
    const swagger = await res.json();

    const ticketPaths = Object.keys(swagger.paths).filter(p => p.includes('ticket'));

    console.log('=== TICKET ENDPOINTS IN SWAGGER ===\n');

    for (const p of ticketPaths) {
        console.log(`PATH: ${p}`);
        const methods = Object.keys(swagger.paths[p]);
        for (const m of methods) {
            const op = swagger.paths[p][m];
            console.log(`  METHOD: ${m.toUpperCase()}`);
            console.log(`  SUMMARY: ${op.summary || op.description || 'N/A'}`);
            if (op.parameters) {
                console.log(`  PARAMS:`, op.parameters.map(param => ({ name: param.name, in: param.in, required: param.required })));
            }
            if (op.responses) {
                console.log(`  RESPONSES:`, Object.keys(op.responses));
            }
        }
        console.log('---');
    }
}

inspectTicketDocs();
