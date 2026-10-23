export type EngagementScope = {
  owner: string;
  targets: string[];
  exclusions: string[];
  startsAt: string;
  endsAt: string;
  authorizationReference: string;
};

export function validateEngagementScope(scope: EngagementScope): string[] {
  const errors: string[] = [];
  if (!scope.owner.trim()) errors.push('Informe o proprietário do ambiente.');
  if (!scope.targets.length) errors.push('Informe pelo menos um alvo autorizado.');
  if (!scope.authorizationReference.trim()) errors.push('Informe a referência da autorização.');
  if (!scope.startsAt || !scope.endsAt) errors.push('Informe a janela de teste.');
  if (scope.startsAt && scope.endsAt && new Date(scope.endsAt) <= new Date(scope.startsAt)) {
    errors.push('A janela de teste é inválida.');
  }
  return errors;
}

export function isScopeActive(scope: EngagementScope, now = new Date()): boolean {
  return validateEngagementScope(scope).length === 0 &&
    now >= new Date(scope.startsAt) && now <= new Date(scope.endsAt);
}

export function assertAuthorizedAction(scope: EngagementScope): void {
  const errors = validateEngagementScope(scope);
  if (errors.length) throw new Error(`Escopo inválido: ${errors.join(' ')}`);
  if (!isScopeActive(scope)) throw new Error('A janela de teste não está ativa.');
}
