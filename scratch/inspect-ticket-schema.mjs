import fetch from 'node-fetch';

async function inspectTicketSchema() {
    const res = await fetch('https://triageflow.me/api-docs-json');
    const swagger = await res.json();

    const paths = ['/api/ticket/patient/{patientId}', '/api/ticket/by-patient', '/api/ticket/{code}'];

    for (const p of paths) {
        console.log(`\n=== SCHEMA FOR ${p} ===`);
        const getOp = swagger.paths[p]?.get;
        console.log(JSON.stringify(getOp, null, 2));
    }

    if (swagger.components?.schemas) {
        console.log('\n=== SCHEMAS IN COMPONENTS ===');
        const ticketSchemas = Object.keys(swagger.components.schemas).filter(s => s.toLowerCase().includes('ticket'));
        for (const s of ticketSchemas) {
            console.log(`SCHEMA ${s}:`, JSON.stringify(swagger.components.schemas[s], null, 2));
        }
    }
}

inspectTicketSchema();
