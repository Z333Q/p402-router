import { redirect } from 'next/navigation';

export default function MeterIndex() {
    redirect('/dashboard/meter/events');
}
