import { tutorApi } from '../api/tutorApi';
import { useAsync } from './useAsync';

let cache = null;
/** Danh mục môn học / cấp học / thành phố (cache trong phiên) */
export function useMeta() {
  return useAsync(async () => {
    if (!cache) cache = await tutorApi.meta();
    return cache;
  }, []);
}
