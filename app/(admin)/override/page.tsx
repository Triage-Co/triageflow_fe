import { redirect } from 'next/navigation';

export default function AdminOverridePage() {
    redirect('/admin/dashboard');
}
