const API = 'https://www.triageflow.me';
const ids = ['70298ee7-7214-4005-b0ae-20c4eb9bf33e', '53b75105-e615-461e-8df5-bf1d4cb5aaa7'];

async function main() {
    const doctors = await fetch(`${API}/api/doctor`).then((r) => r.json());
    console.log('All doctors:', JSON.stringify(doctors.data, null, 2));

    for (const id of ids) {
        for (const date of ['2026-07-11', '2026-07-10']) {
            const res = await fetch(`${API}/api/doctor/${id}/slot?date=${date}`);
            const json = await res.json().catch(() => ({}));
            console.log(`\n${id} @ ${date}:`, res.status, json.message || json.detail || 'ok');
            if (json.data) console.log(JSON.stringify(json.data, null, 2).slice(0, 600));
        }
    }
}

main();
