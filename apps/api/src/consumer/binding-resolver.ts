import { createDevelopmentBindingResolver, type BindingResolver } from '@bih/security';

let cachedDevelopmentResolver: BindingResolver | undefined;

/**
 * Development binding resolver until TASK-2.1 persists organizations and bindings.
 * Request middleware will call {@link resolveConsumerContext} with this resolver.
 */
export function getDevelopmentBindingResolver(): BindingResolver {
  if (cachedDevelopmentResolver === undefined) {
    cachedDevelopmentResolver = createDevelopmentBindingResolver();
  }
  return cachedDevelopmentResolver;
}
