import { useHealthCheck } from "$/frontend/utils/api/health";
import { getAppSha } from "$/frontend/utils/app-version";

/**
 * Compares the backend's commit sha (polled via /health) against the sha
 * this bundle was built from. A mismatch means the backend has been
 * redeployed since this tab loaded.
 */
export function useVersionDrift(): boolean {
  const { data } = useHealthCheck();
  const appSha = getAppSha();

  if (!data?.sha || !appSha) {
    return false;
  }

  return data.sha !== appSha;
}
