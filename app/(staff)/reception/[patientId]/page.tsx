import { ReceptionPatientPage } from '@/modules/reception/components/ReceptionPatientPage';

export default function Page({ params }: { params: Promise<{ patientId: string }> }) {
    return <ReceptionPatientPage params={params} />;
}
