export function useRegisterSW() {
  return {
    needRefresh: [false],
    updateServiceWorker: (_reloadPage?: boolean) => Promise.resolve(),
  };
}
