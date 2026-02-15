import { redirect } from "next/navigation";

export default function WaitingRoomPage() {
  redirect("/dashboard/messages");
}
