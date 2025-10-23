import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getOperationText = (type: string) => {
  switch (type) {
    case "bridge":
      return "Bridging";
    case "transfer":
      return "Transferring";
    case "bridgeAndExecute":
      return "Bridge & Execute";
    case "swap":
      return "Swapping";
    default:
      return "Processing";
  }
};

export const getStatusText = (type: string, operationType: string) => {
  const opText = getOperationText(operationType);

  switch (type) {
    case "INTENT_ACCEPTED":
      return "Intent Accepted";
    case "INTENT_HASH_SIGNED":
      return "Signing Transaction";
    case "INTENT_SUBMITTED":
      return "Submitting Transaction";
    case "INTENT_COLLECTION":
      return "Collecting Confirmations";
    case "INTENT_COLLECTION_COMPLETE":
      return "Confirmations Complete";
    case "APPROVAL":
      return "Approving";
    case "TRANSACTION_SENT":
      return "Sending Transaction";
    case "RECEIPT_RECEIVED":
      return "Receipt Received";
    case "TRANSACTION_CONFIRMED":
    case "INTENT_FULFILLED":
      return `${opText} Complete`;
    default:
      return `Processing ${opText}`;
  }
};
