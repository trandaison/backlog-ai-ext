// Google Analytics 4 tracking types
export type TrackingEvent = {
  name: 'extension_install' | 'extension_chat';
  params: {
    timestamp: string;
    version: string;
  };
};

export type CollectData = {
  uniqueId: string;
  event: string;
}
