export const translations = {
  'pt-BR': {
    appTitle: 'MeuTreino Pro',
    badgePro: 'Pro Biomechanics',
    appSubtitle: 'Hipertrofia Individualizada & Cinesiologia',
    tabHome: 'Início',
    tabWorkout: 'Treino',
    tabActiveWorkout: 'Treino Ativo',
    tabProfile: 'Perfil',
    toolPlates: 'Calculadora de Anilhas',
    platesBtn: 'Anilhas',
    soundOn: 'Som Ativado',
    soundOff: 'Som Desativado',
    shareBtn: 'Partilhar',
  }
};

export function useI18n() {
  return {
    t: translations['pt-BR'],
    locale: 'pt-BR',
  };
}
