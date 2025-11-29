import { useEvents } from "../queries";

export default function LoaderComponent() {
  const { isPending, error, data } = useEvents();
  if (isPending) {
    console.log("Loading events...");
  }
  if (error) {
    console.log("Error loading events:", error);
  }
  if (data) {
    console.log("Events loaded:", data);
  }
  return null;
}
