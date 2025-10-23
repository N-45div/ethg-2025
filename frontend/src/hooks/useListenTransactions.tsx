"use client";
import { getStatusText } from "@/lib/utils";
import {
  NEXUS_EVENTS,
  type NexusSDK,
  type ProgressStep,
  type ProgressSteps,
  type SwapStep,
} from "@avail-project/nexus-core";
import { useCallback, useEffect, useState } from "react";

// Swap-specific step handling
export const getTextFromSwapStep = (step: SwapStep): string => {
  switch (step.type) {
    case "CREATE_PERMIT_EOA_TO_EPHEMERAL":
      return `Creating permit for eoa to ephemeral for ${step.symbol} on ${
        step.chain?.name || "chain"
      }`;
    case "CREATE_PERMIT_FOR_SOURCE_SWAP":
      return `Creating permit for source swap for ${step.symbol} on ${
        step.chain?.name || "chain"
      }`;
    case "DESTINATION_SWAP_BATCH_TX":
      return `Creating destination swap transaction`;
    case "DESTINATION_SWAP_HASH":
      return `Hash for destination swap on ${step.chain?.name || "chain"}`;
    case "DETERMINING_SWAP":
      return `Generating routes for XCS`;
    case "RFF_ID":
      return `Chain abstracted intent`;
    case "SOURCE_SWAP_BATCH_TX":
      return "Creating source swap batch transactions";
    case "SOURCE_SWAP_HASH":
      return `Hash for source swap on ${step.chain?.name || "chain"}`;
    case "SWAP_COMPLETE":
      return `Swap is completed`;
    case "SWAP_START":
      return "Swap starting";
    default:
      return "Processing swap";
  }
};

const swapSteps = [
  { id: 0, type: "SWAP_START", typeID: "SWAP_START", name: "Starting Swap" },
  {
    id: 1,
    type: "DETERMINING_SWAP",
    typeID: "DETERMINING_SWAP",
    name: "Finding Best Route",
  },
  {
    id: 2,
    type: "SOURCE_SWAP_BATCH_TX",
    typeID: "SOURCE_SWAP_BATCH_TX",
    name: "Source Transaction",
  },
  {
    id: 3,
    type: "SOURCE_SWAP_HASH",
    typeID: "SOURCE_SWAP_HASH",
    name: "Source Transaction hash",
  },
  { id: 4, type: "RFF_ID", typeID: "RFF_ID", name: "Source Transaction hash" },
  {
    id: 5,
    type: "DESTINATION_SWAP_BATCH_TX",
    typeID: "DESTINATION_SWAP_BATCH_TX",
    name: "Destination Transaction",
  },
  {
    id: 6,
    type: "DESTINATION_SWAP_HASH",
    typeID: "DESTINATION_SWAP_HASH",
    name: "Destination Transaction hash",
  },
  {
    id: 7,
    type: "CREATE_PERMIT_FOR_SOURCE_SWAP",
    typeID: "CREATE_PERMIT_FOR_SOURCE_SWAP",
    name: "Permit",
  },

  {
    id: 8,
    type: "CREATE_PERMIT_EOA_TO_EPHEMERAL",
    typeID: "CREATE_PERMIT_EOA_TO_EPHEMERAL",
    name: "Permit Ephemeral",
  },
  {
    id: 9,
    type: "SWAP_COMPLETE",
    typeID: "SWAP_COMPLETE",
    name: "Swap Complete",
  },
];

interface ProcessingStep {
  id: number;
  completed: boolean;
  progress: number; // 0-100
  stepData?: ProgressStep | ProgressSteps | SwapStep;
}

interface ProcessingState {
  currentStep: number;
  totalSteps: number;
  steps: ProcessingStep[];
  statusText: string;
}

const DEFAULT_INITIAL_STEPS = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasTypeID(obj: any): obj is { typeID: string } {
  return obj && typeof obj === "object" && "typeID" in obj;
}

const getInitialProcessingState = (
  totalSteps = DEFAULT_INITIAL_STEPS,
  statusText = "Verifying Request",
): ProcessingState => ({
  currentStep: 0,
  totalSteps,
  steps: Array.from({ length: totalSteps }, (_, i) => ({
    id: i,
    completed: false,
    progress: 0,
  })),
  statusText,
});

const useListenTransaction = ({
  sdk,
  type,
}: {
  sdk: NexusSDK;
  type: "bridge" | "swap" | "transfer" | "bridgeAndExecute";
}) => {
  const [processing, setProcessing] = useState<ProcessingState>(() =>
    getInitialProcessingState(),
  );
  const [explorerURL, setExplorerURL] = useState<string | null>(null);
  const [explorerURLs, setExplorerURLs] = useState<{
    source?: string;
    destination?: string;
  }>({});

  const resetProcessingState = useCallback(() => {
    setProcessing(getInitialProcessingState());
    setExplorerURL(null);
    setExplorerURLs({});
  }, []);

  useEffect(() => {
    if (!sdk) return;

    // SWAP-specific logic
    if (type === "swap") {
      const initialSteps = swapSteps.map((step, index) => ({
        id: index,
        completed: false,
        progress: 0,
        stepData: step,
      }));
      setProcessing(
        getInitialProcessingState(swapSteps.length, "Preparing Swap"),
      );
      setProcessing((prev) => ({ ...prev, steps: initialSteps }));

      const handleSwapStepComplete = (stepData: SwapStep) => {
        setProcessing((prev) => {
          const stepIndex = swapSteps.findIndex(
            (s) => s.typeID === stepData.type,
          );

          if (stepIndex === -1) {
            const nextStep = Math.min(prev.currentStep + 1, prev.totalSteps);
            return {
              ...prev,
              currentStep: nextStep,
              statusText: getTextFromSwapStep(stepData),
            };
          }

          const newSteps = [...prev.steps];
          for (let i = 0; i <= stepIndex && i < newSteps.length; i++) {
            newSteps[i] = {
              ...newSteps[i],
              completed: true,
              progress: 100,
              stepData: i === stepIndex ? stepData : newSteps[i].stepData,
            };
          }

          const nextStep = Math.min(stepIndex + 1, prev.totalSteps);
          return {
            ...prev,
            currentStep: nextStep,
            steps: newSteps,
            statusText: getTextFromSwapStep(stepData),
          };
        });

        if (stepData.type === "SOURCE_SWAP_HASH" && "explorerURL" in stepData) {
          setExplorerURLs((prev) => ({
            ...prev,
            source: stepData.explorerURL,
          }));
        } else if (
          stepData.type === "DESTINATION_SWAP_HASH" &&
          "explorerURL" in stepData
        ) {
          setExplorerURLs((prev) => ({
            ...prev,
            destination: stepData.explorerURL,
          }));
          setExplorerURL(stepData.explorerURL);
        }
      };

      sdk.nexusEvents?.on(NEXUS_EVENTS.SWAP_STEPS, handleSwapStepComplete);
      return () => {
        sdk.nexusEvents?.off(NEXUS_EVENTS.SWAP_STEPS, handleSwapStepComplete);
      };
    }

    // Generic transaction logic (bridge, transfer, bridgeAndExecute)
    let expectedReceived = false;
    const pendingSteps: ProgressStep[] = [];

    const processStep = (
      state: ProcessingState,
      stepData: ProgressStep,
    ): ProcessingState => {
      const { type: stepType, typeID, data } = stepData;
      let stepIndex = state.steps.findIndex(
        (s) => hasTypeID(s.stepData) && s.stepData.typeID === typeID,
      );

      if (stepIndex === -1) {
        stepIndex = Math.min(state.currentStep, state.totalSteps - 1);
      }

      const newSteps = [...state.steps];
      for (let i = 0; i <= stepIndex && i < newSteps.length; i++) {
        newSteps[i] = {
          ...newSteps[i],
          completed: true,
          progress: 100,
          stepData: i === stepIndex ? stepData : newSteps[i].stepData,
        };
      }

      const nextStep = Math.min(stepIndex + 1, state.totalSteps);
      let description = getStatusText(stepData?.type, type);
      if (stepType === "INTENT_COLLECTION" && data) {
        description = "Collecting Confirmations";
      }

      return {
        ...state,
        currentStep: nextStep,
        steps: newSteps,
        statusText: description,
      };
    };

    const handleExpectedSteps = (expectedSteps: ProgressSteps[]) => {
      expectedReceived = true;
      const stepCount = Array.isArray(expectedSteps)
        ? expectedSteps.length
        : expectedSteps;
      const steps = Array.isArray(expectedSteps) ? expectedSteps : [];

      const initialSteps = Array.from({ length: stepCount }, (_, i) => ({
        id: i,
        completed: false,
        progress: 0,
        stepData: steps[i] || null,
      }));

      setProcessing((prev) => {
        const completedTypeIDs = prev.steps
          .filter((s) => s.completed)
          .map((s) => {
            if (hasTypeID(s.stepData)) {
              return s.stepData.typeID;
            }
            return null;
          })
          .filter(Boolean) as string[];

        const mergedSteps = initialSteps.map((step) => {
          if (hasTypeID(step.stepData)) {
            if (completedTypeIDs.includes(step.stepData.typeID)) {
              return { ...step, completed: true, progress: 100 };
            }
          }
          return step;
        });

        const completedCount = mergedSteps.filter((s) => s.completed).length;
        let newState: ProcessingState = {
          ...prev,
          totalSteps: stepCount,
          steps: mergedSteps,
          currentStep: completedCount,
        };

        pendingSteps.forEach((queuedStep) => {
          newState = processStep(newState, queuedStep);
        });
        pendingSteps.length = 0;

        return newState;
      });
    };

    const handleStepComplete = (stepData: ProgressStep) => {
      if (!expectedReceived) {
        pendingSteps.push(stepData);
      } else {
        setProcessing((prev) => processStep(prev, stepData));
      }

      if (
        stepData.typeID === "IS" &&
        stepData.data &&
        "explorerURL" in stepData.data
      ) {
        setExplorerURL(stepData.data.explorerURL as string);
      }
    };

    const expectedEventType =
      type === "bridgeAndExecute"
        ? NEXUS_EVENTS.BRIDGE_EXECUTE_EXPECTED_STEPS
        : NEXUS_EVENTS.EXPECTED_STEPS;
    const completedEventType =
      type === "bridgeAndExecute"
        ? NEXUS_EVENTS.BRIDGE_EXECUTE_COMPLETED_STEPS
        : NEXUS_EVENTS.STEP_COMPLETE;

    sdk.nexusEvents?.on(expectedEventType, handleExpectedSteps);
    sdk.nexusEvents?.on(completedEventType, handleStepComplete);

    return () => {
      sdk.nexusEvents?.off(expectedEventType, handleExpectedSteps);
      sdk.nexusEvents?.off(completedEventType, handleStepComplete);
    };
  }, [sdk, type, resetProcessingState]);

  return { processing, explorerURL, explorerURLs, resetProcessingState };
};

export default useListenTransaction;
