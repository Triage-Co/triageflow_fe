import fetch from 'node-fetch';

async function testPatientBooking() {
    const bookingsRes = await fetch('https://triageflow.me/api/booking');
    const bookingsData = await bookingsRes.json();
    const first = bookingsData.data[0];
    const patientId = first.patient_id;

    const ticketRes = await fetch(`https://triageflow.me/api/ticket/patient/${patientId}`);
    const ticketData = await ticketRes.json();

    console.log('ticket_code:', ticketData.data?.ticket_code);
    console.log('patient:', ticketData.data?.patient);
    console.log('booking_info:', ticketData.data?.booking_info);
}

testPatientBooking();
