/**
 * DISC Questions Data - Zion Recruit
 * 
 * 30 perguntas para avaliação comportamental DISC
 * Cada pergunta possui 4 opções correspondentes aos fatores D, I, S, C
 * O candidato seleciona "Mais parecido comigo" e "Menos parecido comigo" para cada pergunta
 */

export type DISCFactor = 'D' | 'I' | 'S' | 'C';

export interface DISCQuestionOption {
  id: string;
  text: string;
  factor: DISCFactor;
}

export interface DISCQuestion {
  number: number;
  options: DISCQuestionOption[];
}

export const DISC_QUESTIONS: DISCQuestion[] = [
  {
    number: 1,
    options: [
      { id: '1a', text: 'Assumo a liderança e tomo decisões rapidamente', factor: 'D' },
      { id: '1b', text: 'Gosto de conhecer pessoas novas e fazer networking', factor: 'I' },
      { id: '1c', text: 'Prefiro um ambiente estável e previsível', factor: 'S' },
      { id: '1d', text: 'Foco em detalhes e precisão no meu trabalho', factor: 'C' },
    ],
  },
  {
    number: 2,
    options: [
      { id: '2a', text: 'Sou competitivo e gosto de vencer', factor: 'D' },
      { id: '2b', text: 'Sou entusiasmado e otimista', factor: 'I' },
      { id: '2c', text: 'Sou paciente e um bom ouvinte', factor: 'S' },
      { id: '2d', text: 'Sou sistemático e sigo procedimentos', factor: 'C' },
    ],
  },
  {
    number: 3,
    options: [
      { id: '3a', text: 'Delego tarefas e exijo resultados', factor: 'D' },
      { id: '3b', text: 'Motivo os outros com minha energia', factor: 'I' },
      { id: '3c', text: 'Apoio os membros da equipe de forma consistente', factor: 'S' },
      { id: '3d', text: 'Analiso os problemas antes de agir', factor: 'C' },
    ],
  },
  {
    number: 4,
    options: [
      { id: '4a', text: 'Sou direto e vou direto ao ponto', factor: 'D' },
      { id: '4b', text: 'Sou comunicativo e expressivo', factor: 'I' },
      { id: '4c', text: 'Sou calmo e equilibrado', factor: 'S' },
      { id: '4d', text: 'Sou preciso e exigente', factor: 'C' },
    ],
  },
  {
    number: 5,
    options: [
      { id: '5a', text: 'Enfrento desafios de frente', factor: 'D' },
      { id: '5b', text: 'Construo relacionamentos com facilidade', factor: 'I' },
      { id: '5c', text: 'Mantenho a harmonia nos grupos', factor: 'S' },
      { id: '5d', text: 'Garanto a qualidade nas entregas', factor: 'C' },
    ],
  },
  {
    number: 6,
    options: [
      { id: '6a', text: 'Prefiro liderar em vez de seguir', factor: 'D' },
      { id: '6b', text: 'Gosto de ser o centro das atenções', factor: 'I' },
      { id: '6c', text: 'Evito conflitos sempre que possível', factor: 'S' },
      { id: '6d', text: 'Prefiro comunicação por escrito', factor: 'C' },
    ],
  },
  {
    number: 7,
    options: [
      { id: '7a', text: 'Defino metas ambiciosas para mim mesmo', factor: 'D' },
      { id: '7b', text: 'Sou espontâneo e flexível', factor: 'I' },
      { id: '7c', text: 'Sou leal e confiável', factor: 'S' },
      { id: '7d', text: 'Pesquiso minuciosamente antes de decidir', factor: 'C' },
    ],
  },
  {
    number: 8,
    options: [
      { id: '8a', text: 'Fico impaciente com o progresso lento', factor: 'D' },
      { id: '8b', text: 'Às vezes deixo passar detalhes', factor: 'I' },
      { id: '8c', text: 'Tenho dificuldade com mudanças repentinas', factor: 'S' },
      { id: '8d', text: 'Posso ser excessivamente crítico', factor: 'C' },
    ],
  },
  {
    number: 9,
    options: [
      { id: '9a', text: 'Tomo decisões baseadas em resultados', factor: 'D' },
      { id: '9b', text: 'Tomo decisões baseadas na intuição', factor: 'I' },
      { id: '9c', text: 'Tomo decisões baseadas em consenso', factor: 'S' },
      { id: '9d', text: 'Tomo decisões baseadas em dados', factor: 'C' },
    ],
  },
  {
    number: 10,
    options: [
      { id: '10a', text: 'Sou motivado por conquistas', factor: 'D' },
      { id: '10b', text: 'Sou motivado por reconhecimento', factor: 'I' },
      { id: '10c', text: 'Sou motivado por segurança', factor: 'S' },
      { id: '10d', text: 'Sou motivado por precisão', factor: 'C' },
    ],
  },
  {
    number: 11,
    options: [
      { id: '11a', text: 'Me desenvolvo bem sob pressão', factor: 'D' },
      { id: '11b', text: 'Trouxo energia para as equipes', factor: 'I' },
      { id: '11c', text: 'Crio um ambiente de apoio e confiança', factor: 'S' },
      { id: '11d', text: 'Mantenho padrões elevados de qualidade', factor: 'C' },
    ],
  },
  {
    number: 12,
    options: [
      { id: '12a', text: 'Valorizo eficiência mais do que perfeição', factor: 'D' },
      { id: '12b', text: 'Valorizo relacionamentos mais do que tarefas', factor: 'I' },
      { id: '12c', text: 'Valorizo estabilidade mais do que mudança', factor: 'S' },
      { id: '12d', text: 'Valorizo correção mais do que velocidade', factor: 'C' },
    ],
  },
  {
    number: 13,
    options: [
      { id: '13a', text: 'Assumo riscos quando necessário', factor: 'D' },
      { id: '13b', text: 'Inspiro outros com minha visão', factor: 'I' },
      { id: '13c', text: 'Me adapto às necessidades dos outros', factor: 'S' },
      { id: '13d', text: 'Sigo protocolos estabelecidos', factor: 'C' },
    ],
  },
  {
    number: 14,
    options: [
      { id: '14a', text: 'Enfrento problemas diretamente', factor: 'D' },
      { id: '14b', text: 'Uso humor para aliviar tensões', factor: 'I' },
      { id: '14c', text: 'Busco conciliação em conflitos', factor: 'S' },
      { id: '14d', text: 'Recorro a fatos em discordâncias', factor: 'C' },
    ],
  },
  {
    number: 15,
    options: [
      { id: '15a', text: 'Foco em resultados financeiros', factor: 'D' },
      { id: '15b', text: 'Foco no moral da equipe', factor: 'I' },
      { id: '15c', text: 'Foco na coesão da equipe', factor: 'S' },
      { id: '15d', text: 'Foco na melhoria de processos', factor: 'C' },
    ],
  },
  {
    number: 16,
    options: [
      { id: '16a', text: 'Prefiro reuniões curtas e focadas', factor: 'D' },
      { id: '16b', text: 'Gosto de sessões de brainstorming', factor: 'I' },
      { id: '16c', text: 'Prefiro reuniões estruturadas e planejadas', factor: 'S' },
      { id: '16d', text: 'Preciso de pauta e atas de reunião', factor: 'C' },
    ],
  },
  {
    number: 17,
    options: [
      { id: '17a', text: 'Sou assertivo ao expressar opiniões', factor: 'D' },
      { id: '17b', text: 'Sou persuasivo em discussões', factor: 'I' },
      { id: '17c', text: 'Sou diplomático na comunicação', factor: 'S' },
      { id: '17d', text: 'Sou objetivo em apresentações', factor: 'C' },
    ],
  },
  {
    number: 18,
    options: [
      { id: '18a', text: 'Troco rapidamente entre tarefas', factor: 'D' },
      { id: '18b', text: 'Lido com múltiplas interações sociais', factor: 'I' },
      { id: '18c', text: 'Termino uma tarefa antes de iniciar outra', factor: 'S' },
      { id: '18d', text: 'Organizo tarefas de forma sistemática', factor: 'C' },
    ],
  },
  {
    number: 19,
    options: [
      { id: '19a', text: 'Encaro críticas como um desafio', factor: 'D' },
      { id: '19b', text: 'Levo críticas para o lado pessoal', factor: 'I' },
      { id: '19c', text: 'Aprecio feedbacks construtivos', factor: 'S' },
      { id: '19d', text: 'Analiso críticas de forma objetiva', factor: 'C' },
    ],
  },
  {
    number: 20,
    options: [
      { id: '20a', text: 'Prefiro trabalho variado e desafiador', factor: 'D' },
      { id: '20b', text: 'Prefiro trabalho com interação social', factor: 'I' },
      { id: '20c', text: 'Prefiro trabalho consistente e rotineiro', factor: 'S' },
      { id: '20d', text: 'Prefiro trabalho que exige precisão', factor: 'C' },
    ],
  },
  {
    number: 21,
    options: [
      { id: '21a', text: 'Tomo decisões rápidas com pouca informação', factor: 'D' },
      { id: '21b', text: 'Confio nos meus instintos', factor: 'I' },
      { id: '21c', text: 'Consulto outros antes de decidir', factor: 'S' },
      { id: '21d', text: 'Preciso de todos os fatos antes de decidir', factor: 'C' },
    ],
  },
  {
    number: 22,
    options: [
      { id: '22a', text: 'Sou confortável com autoridade', factor: 'D' },
      { id: '22b', text: 'Sou acessível e amigável', factor: 'I' },
      { id: '22c', text: 'Sou cooperativo e prestativo', factor: 'S' },
      { id: '22d', text: 'Sou preciso e minucioso', factor: 'C' },
    ],
  },
  {
    number: 23,
    options: [
      { id: '23a', text: 'Questiono o estado atual das coisas', factor: 'D' },
      { id: '23b', text: 'Trouxo perspectivas inovadoras', factor: 'I' },
      { id: '23c', text: 'Preservo o que funciona bem', factor: 'S' },
      { id: '23d', text: 'Garanto conformidade com os padrões', factor: 'C' },
    ],
  },
  {
    number: 24,
    options: [
      { id: '24a', text: 'Posso ser visto como exigente demais', factor: 'D' },
      { id: '24b', text: 'Posso ser visto como desorganizado', factor: 'I' },
      { id: '24c', text: 'Posso ser visto como demasiadamente complacente', factor: 'S' },
      { id: '24d', text: 'Posso ser visto como perfeccionista', factor: 'C' },
    ],
  },
  {
    number: 25,
    options: [
      { id: '25a', text: 'Inspiro outros a tomar atitudes', factor: 'D' },
      { id: '25b', text: 'Crio entusiasmo e empolgação', factor: 'I' },
      { id: '25c', text: 'Forneço apoio constante e confiável', factor: 'S' },
      { id: '25d', text: 'Garanto que nada seja esquecido', factor: 'C' },
    ],
  },
  {
    number: 26,
    options: [
      { id: '26a', text: 'Foco em oportunidades', factor: 'D' },
      { id: '26b', text: 'Foco em possibilidades', factor: 'I' },
      { id: '26c', text: 'Foco em relacionamentos', factor: 'S' },
      { id: '26d', text: 'Foco em potenciais problemas', factor: 'C' },
    ],
  },
  {
    number: 27,
    options: [
      { id: '27a', text: 'Trabalho bem de forma independente', factor: 'D' },
      { id: '27b', text: 'Me desenvolvo em ambientes colaborativos', factor: 'I' },
      { id: '27c', text: 'Prefiro equipes pequenas e unidas', factor: 'S' },
      { id: '27d', text: 'Trabalho bem com diretrizes claras', factor: 'C' },
    ],
  },
  {
    number: 28,
    options: [
      { id: '28a', text: 'Entrego resultados sob prazos apertados', factor: 'D' },
      { id: '28b', text: 'Mantenho o espírito da equipe sob pressão', factor: 'I' },
      { id: '28c', text: 'Providencio estabilidade durante mudanças', factor: 'S' },
      { id: '28d', text: 'Mantenho a precisão sob pressão', factor: 'C' },
    ],
  },
  {
    number: 29,
    options: [
      { id: '29a', text: 'Gosto de negociar e fechar acordos rapidamente', factor: 'D' },
      { id: '29b', text: 'Facilmente convenço outros a adotarem minhas ideias', factor: 'I' },
      { id: '29c', text: 'Sou referência de confiança para meus colegas', factor: 'S' },
      { id: '29d', text: 'Sempre verifico todas as informações antes de apresentá-las', factor: 'C' },
    ],
  },
  {
    number: 30,
    options: [
      { id: '30a', text: 'Diante de uma crise, assumo o controle da situação', factor: 'D' },
      { id: '30b', text: 'Em momentos de tensão, animo e motive a equipe', factor: 'I' },
      { id: '30c', text: 'Em situações difíceis, busco acalmar e apoiar todos', factor: 'S' },
      { id: '30d', text: 'Quando surge um imprevisto, estruturo um plano de ação detalhado', factor: 'C' },
    ],
  },
];

export const TOTAL_QUESTIONS = DISC_QUESTIONS.length;

/**
 * Get a question by its number
 */
export function getQuestionByNumber(number: number): DISCQuestion | undefined {
  return DISC_QUESTIONS.find(q => q.number === number);
}

/**
 * Get the factor for a specific option
 */
export function getOptionFactor(questionNumber: number, optionId: string): DISCFactor | undefined {
  const question = getQuestionByNumber(questionNumber);
  if (!question) return undefined;
  
  const option = question.options.find(o => o.id === optionId);
  return option?.factor;
}
