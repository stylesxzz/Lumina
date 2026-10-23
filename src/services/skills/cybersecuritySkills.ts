export type LuminaSkill = {
  id: string;
  name: string;
  description: string;
  risk: 'passive' | 'controlled-active';
  requiresScope: boolean;
};

export const cybersecuritySkills: LuminaSkill[] = [
  {
    id: 'asset-inventory',
    name: 'Inventário de ativos',
    description: 'Organiza ativos, domínios, IPs e evidências fornecidas pelo operador.',
    risk: 'passive',
    requiresScope: false,
  },
  {
    id: 'surface-analysis',
    name: 'Análise de superfície',
    description: 'Analisa serviços e metadados dentro de um escopo autorizado.',
    risk: 'controlled-active',
    requiresScope: true,
  },
  {
    id: 'vulnerability-validation',
    name: 'Validação de vulnerabilidades',
    description: 'Valida achados sem exploração destrutiva, persistência ou evasão.',
    risk: 'controlled-active',
    requiresScope: true,
  },
  {
    id: 'threat-modeling',
    name: 'Threat modeling',
    description: 'Produz modelos de ameaça, caminhos de ataque e controles defensivos.',
    risk: 'passive',
    requiresScope: false,
  },
  {
    id: 'hardening-report',
    name: 'Hardening e relatório',
    description: 'Gera recomendações priorizadas e relatório reproduzível.',
    risk: 'passive',
    requiresScope: false,
  },
];
