import { FontAwesome5 } from "@expo/vector-icons";

const icons = {
  "albums-outline": "graduation-cap",
  "alert-circle-outline": "exclamation-circle",
  "arrow-back": "arrow-left",
  "bar-chart-outline": "chart-bar",
  "calendar-outline": "calendar-alt",
  "card-outline": "credit-card",
  "cash-outline": "money-bill-wave",
  "chatbubble-ellipses-outline": "comments",
  "checkmark-circle": "check-circle",
  "checkmark-circle-outline": "check-circle",
  "checkmark-done-outline": "check-double",
  "chevron-down": "chevron-down",
  "chevron-up": "chevron-up",
  "cloud-upload-outline": "cloud-upload-alt",
  "document-text-outline": "folder-open",
  "folder-open-outline": "folder-open",
  "home-outline": "home",
  "image-outline": "image",
  "information-circle": "info-circle",
  "layers-outline": "list-alt",
  "library-outline": "graduation-cap",
  "person-circle-outline": "user-circle",
  "person-outline": "user",
  "people-outline": "users",
  "pencil-outline": "edit",
  "play-circle-outline": "play-circle",
  "receipt-outline": "receipt",
  "search-outline": "search",
  "send-outline": "paper-plane",
  "sparkles-outline": "star",
  "time-outline": "clock",
  "trash-outline": "trash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",
  "warning": "exclamation-triangle"
};

export default function AppIcon({ name, ...props }) {
  const icon = icons[name] || name;
  return <FontAwesome5 name={icon} solid {...props} />;
}
