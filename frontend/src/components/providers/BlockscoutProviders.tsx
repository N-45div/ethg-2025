'use client';

import {
  NotificationProvider,
  TransactionPopupProvider,
} from '@blockscout/app-sdk';
import { useMemo } from 'react';

interface BlockscoutProvidersProps {
  children: React.ReactNode;
}

const BlockscoutProviders = ({ children }: BlockscoutProvidersProps) => {
  const content = useMemo(
    () => (
      <NotificationProvider>
        <TransactionPopupProvider>{children}</TransactionPopupProvider>
      </NotificationProvider>
    ),
    [children],
  );

  return content;
};

export default BlockscoutProviders;
