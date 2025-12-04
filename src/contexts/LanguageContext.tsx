import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "es" | "ru" | "fr" | "pt";

interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

const translations: Translations = {
  // Navigation
  "nav.home": { en: "Home", es: "Inicio", ru: "Главная", fr: "Accueil", pt: "Início" },
  "nav.battles": { en: "Battles", es: "Batallas", ru: "Баттлы", fr: "Battles", pt: "Batalhas" },
  "nav.signin": { en: "Sign In", es: "Iniciar Sesión", ru: "Войти", fr: "Connexion", pt: "Entrar" },
  "nav.signout": { en: "Sign Out", es: "Cerrar Sesión", ru: "Выйти", fr: "Déconnexion", pt: "Sair" },
  
  // Landing page
  "hero.title1": { en: "Fair.", es: "Justo.", ru: "Честно.", fr: "Juste.", pt: "Justo." },
  "hero.title2": { en: "Fast.", es: "Rápido.", ru: "Быстро.", fr: "Rapide.", pt: "Rápido." },
  "hero.title3": { en: "Flawless.", es: "Perfecto.", ru: "Безупречно.", fr: "Parfait.", pt: "Perfeito." },
  "hero.subtitle": { 
    en: "The modern judging system for breakdance battles. Real-time voting, live visualization, and transparent scoring.",
    es: "El sistema de jurado moderno para batallas de breakdance. Votación en tiempo real, visualización en vivo y puntuación transparente.",
    ru: "Современная система судейства для брейк-данс баттлов. Голосование в реальном времени, живая визуализация и прозрачная оценка.",
    fr: "Le système de jury moderne pour les battles de breakdance. Vote en temps réel, visualisation en direct et notation transparente.",
    pt: "O sistema moderno de arbitragem para batalhas de breakdance. Votação em tempo real, visualização ao vivo e pontuação transparente."
  },
  "hero.findBattle": { en: "Find a Battle", es: "Buscar Batalla", ru: "Найти Баттл", fr: "Trouver un Battle", pt: "Encontrar Batalha" },
  "hero.organize": { en: "Organize Event", es: "Organizar Evento", ru: "Организовать Событие", fr: "Organiser un Événement", pt: "Organizar Evento" },
  
  // Features
  "features.title": { en: "Everything You Need", es: "Todo lo que Necesitas", ru: "Всё что Нужно", fr: "Tout ce dont Vous Avez Besoin", pt: "Tudo que Você Precisa" },
  "features.roles": { en: "Role-Based Access", es: "Acceso por Roles", ru: "Доступ по Ролям", fr: "Accès par Rôles", pt: "Acesso por Funções" },
  "features.realtime": { en: "Real-time Scoring", es: "Puntuación en Tiempo Real", ru: "Оценка в Реальном Времени", fr: "Score en Temps Réel", pt: "Pontuação em Tempo Real" },
  "features.fair": { en: "Fair Judging", es: "Jurado Justo", ru: "Честное Судейство", fr: "Jugement Équitable", pt: "Arbitragem Justa" },
  
  // Judge panel
  "judge.waiting": { en: "Waiting for Battle", es: "Esperando Batalla", ru: "Ожидание Баттла", fr: "En Attente du Battle", pt: "Aguardando Batalha" },
  "judge.waitingDesc": { en: "The operator will start the match soon. Stay ready!", es: "El operador iniciará la partida pronto. ¡Prepárate!", ru: "Оператор скоро начнёт матч. Будьте готовы!", fr: "L'opérateur va bientôt commencer le match. Restez prêt!", pt: "O operador iniciará a partida em breve. Fique pronto!" },
  "judge.voteSubmitted": { en: "Vote Submitted", es: "Voto Enviado", ru: "Голос Отправлен", fr: "Vote Soumis", pt: "Voto Enviado" },
  "judge.tapToVote": { en: "Tap to Vote", es: "Toca para Votar", ru: "Нажмите для Голосования", fr: "Appuyez pour Voter", pt: "Toque para Votar" },
  "judge.voteHistory": { en: "Vote History", es: "Historial de Votos", ru: "История Голосов", fr: "Historique des Votes", pt: "Histórico de Votos" },
  
  // Registration
  "register.title": { en: "Register as Dancer", es: "Registrarse como Bailarín", ru: "Регистрация Танцора", fr: "S'inscrire comme Danseur", pt: "Registrar como Dançarino" },
  "register.selectCategory": { en: "Select Category", es: "Seleccionar Categoría", ru: "Выберите Категорию", fr: "Sélectionner une Catégorie", pt: "Selecione a Categoria" },
  "register.name": { en: "Dancer Name", es: "Nombre del Bailarín", ru: "Имя Танцора", fr: "Nom du Danseur", pt: "Nome do Dançarino" },
  "register.city": { en: "City", es: "Ciudad", ru: "Город", fr: "Ville", pt: "Cidade" },
  "register.age": { en: "Age", es: "Edad", ru: "Возраст", fr: "Âge", pt: "Idade" },
  "register.submit": { en: "Register Now", es: "Registrarse Ahora", ru: "Зарегистрироваться", fr: "S'inscrire Maintenant", pt: "Registrar Agora" },
  "register.success": { en: "You're In!", es: "¡Estás Dentro!", ru: "Вы Зарегистрированы!", fr: "Vous Êtes Inscrit!", pt: "Você Está Dentro!" },
  
  // Battle phases
  "phase.registration": { en: "Registration Open", es: "Registro Abierto", ru: "Регистрация Открыта", fr: "Inscription Ouverte", pt: "Registro Aberto" },
  "phase.selection": { en: "Selection Phase", es: "Fase de Selección", ru: "Фаза Отбора", fr: "Phase de Sélection", pt: "Fase de Seleção" },
  "phase.bracket": { en: "Battle Phase", es: "Fase de Batalla", ru: "Фаза Баттлов", fr: "Phase de Battle", pt: "Fase de Batalha" },
  "phase.completed": { en: "Completed", es: "Completado", ru: "Завершено", fr: "Terminé", pt: "Concluído" },
  
  // Common
  "common.round": { en: "Round", es: "Ronda", ru: "Раунд", fr: "Manche", pt: "Rodada" },
  "common.vs": { en: "VS", es: "VS", ru: "VS", fr: "VS", pt: "VS" },
  "common.winner": { en: "Winner", es: "Ganador", ru: "Победитель", fr: "Gagnant", pt: "Vencedor" },
  "common.loading": { en: "Loading...", es: "Cargando...", ru: "Загрузка...", fr: "Chargement...", pt: "Carregando..." },
  "common.back": { en: "Back", es: "Atrás", ru: "Назад", fr: "Retour", pt: "Voltar" },
  "common.save": { en: "Save", es: "Guardar", ru: "Сохранить", fr: "Enregistrer", pt: "Salvar" },
  "common.cancel": { en: "Cancel", es: "Cancelar", ru: "Отмена", fr: "Annuler", pt: "Cancelar" },
  "common.submit": { en: "Submit", es: "Enviar", ru: "Отправить", fr: "Soumettre", pt: "Enviar" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    if (saved && ["en", "es", "ru", "fr", "pt"].includes(saved)) {
      return saved as Language;
    }
    // Try to detect browser language
    const browserLang = navigator.language.split("-")[0];
    if (["en", "es", "ru", "fr", "pt"].includes(browserLang)) {
      return browserLang as Language;
    }
    return "en";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[key]?.[language] || translations[key]?.en || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export const languages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
] as const;