import { redirect } from 'next/navigation';

/**
 * Staff sidebar entry used to open the TV waiting screen.
 * Always go through the room selector so socket join has a real roomId.
 */
export default function StaffRoomDisplayPage() {
    redirect('/display/room');
}
