import { useEffect, useState } from 'react';
import { RequestScope } from '@/lib/request-scope';

export function useRequestScope() {
  const [scope] = useState(() => new RequestScope());
  useEffect(() => () => scope.cancel(), [scope]);
  return scope;
}
