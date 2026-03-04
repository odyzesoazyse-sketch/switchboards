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
  "nav.judge": { en: "Judge", es: "Juez", ru: "Судья", fr: "Juge", pt: "Juiz" },
  "nav.events": { en: "Events", es: "Eventos", ru: "События", fr: "Événements", pt: "Eventos" },
  "nav.ranking": { en: "Ranking", es: "Ranking", ru: "Рейтинг", fr: "Classement", pt: "Ranking" },
  "nav.profile": { en: "Profile", es: "Perfil", ru: "Профиль", fr: "Profil", pt: "Perfil" },
  "nav.signin": { en: "Sign In", es: "Iniciar Sesión", ru: "Войти", fr: "Connexion", pt: "Entrar" },
  "nav.signout": { en: "Sign Out", es: "Cerrar Sesión", ru: "Выйти", fr: "Déconnexion", pt: "Sair" },
  "nav.worldEvents": { en: "World Events", es: "Eventos Mundiales", ru: "Мировые События", fr: "Événements Mondiaux", pt: "Eventos Mundiais" },
  "nav.rankings": { en: "Rankings", es: "Rankings", ru: "Рейтинги", fr: "Classements", pt: "Rankings" },
  "nav.pricing": { en: "Plans", es: "Planes", ru: "Тарифы", fr: "Plans", pt: "Planos" },
  "nav.settings": { en: "Settings", es: "Ajustes", ru: "Настройки", fr: "Paramètres", pt: "Configurações" },
  "nav.logout": { en: "Logout", es: "Salir", ru: "Выйти", fr: "Déconnexion", pt: "Sair" },
  "nav.more": { en: "More", es: "Más", ru: "Ещё", fr: "Plus", pt: "Mais" },
  "nav.close": { en: "Close", es: "Cerrar", ru: "Закрыть", fr: "Fermer", pt: "Fechar" },
  
  // Landing page
  "hero.title1": { en: "Fair.", es: "Justo.", ru: "Честно.", fr: "Juste.", pt: "Justo." },
  "hero.title2": { en: "Fast.", es: "Rápido.", ru: "Быстро.", fr: "Rapide.", pt: "Rápido." },
  "hero.title3": { en: "Flawless.", es: "Perfecto.", ru: "Безупречно.", fr: "Parfait.", pt: "Perfeito." },
  "hero.subtitle": { 
    en: "Professional judging system for all battle dance styles — Breaking, Hip-Hop, Popping, Locking, Krump, Waacking and more.",
    es: "Sistema profesional de jurado para todos los estilos de batalla — Breaking, Hip-Hop, Popping, Locking, Krump, Waacking y más.",
    ru: "Система судейства для всех стилей батловых танцев — Breaking, Hip-Hop, Popping, Locking, Krump, Waacking и других.",
    fr: "Système de jugement professionnel pour tous les styles de danse battle — Breaking, Hip-Hop, Popping, Locking, Krump, Waacking et plus.",
    pt: "Sistema profissional de arbitragem para todos os estilos de dança battle — Breaking, Hip-Hop, Popping, Locking, Krump, Waacking e mais."
  },
  "hero.findBattle": { en: "Find a Battle", es: "Buscar Batalla", ru: "Найти Баттл", fr: "Trouver un Battle", pt: "Encontrar Batalha" },
  "hero.organize": { en: "Organize Event", es: "Organizar Evento", ru: "Организовать Событие", fr: "Organiser un Événement", pt: "Organizar Evento" },
  "hero.exploreEvents": { en: "Explore World Events", es: "Explorar Eventos Mundiales", ru: "Мировые События", fr: "Explorer les Événements", pt: "Explorar Eventos" },
  "hero.badge": { en: "Professional Battle Judging", es: "Jurado Profesional de Batallas", ru: "Профессиональное Судейство Баттлов", fr: "Jugement Professionnel de Battles", pt: "Arbitragem Profissional de Batalhas" },
  
  // Features
  "features.title": { en: "Everything You Need", es: "Todo lo que Necesitas", ru: "Всё что Нужно", fr: "Tout ce dont Vous Avez Besoin", pt: "Tudo que Você Precisa" },
  "features.subtitle": { en: "Complete toolkit for any dance battle style", es: "Kit completo para cualquier estilo de batalla", ru: "Полный набор инструментов для любого стиля баттла", fr: "Kit complet pour tout style de battle", pt: "Kit completo para qualquer estilo de batalha" },
  "features.roles": { en: "Role-Based Access", es: "Acceso por Roles", ru: "Доступ по Ролям", fr: "Accès par Rôles", pt: "Acesso por Funções" },
  "features.rolesDesc": { en: "Organizers, judges, selectors — each with their own interface and permissions", es: "Organizadores, jueces, selectores — cada uno con su propia interfaz", ru: "Организаторы, судьи, селекторы — у каждого свой интерфейс и права", fr: "Organisateurs, juges, sélecteurs — chacun avec son interface", pt: "Organizadores, juízes, seletores — cada um com sua interface" },
  "features.realtime": { en: "Real-time Scoring", es: "Puntuación en Tiempo Real", ru: "Оценка в Реальном Времени", fr: "Score en Temps Réel", pt: "Pontuação em Tempo Real" },
  "features.realtimeDesc": { en: "Judges vote from their devices, results update instantly on the big screen", es: "Los jueces votan desde sus dispositivos, resultados al instante", ru: "Судьи голосуют со своих устройств, результаты обновляются мгновенно", fr: "Les juges votent depuis leurs appareils, résultats instantanés", pt: "Juízes votam de seus dispositivos, resultados instantâneos" },
  "features.twoPhase": { en: "Two-Phase System", es: "Sistema de Dos Fases", ru: "Двухфазная Система", fr: "Système en Deux Phases", pt: "Sistema de Duas Fases" },
  "features.twoPhaseDesc": { en: "Selection round with criteria scoring, then Olympic bracket for top-16", es: "Ronda de selección con criterios, luego bracket olímpico para top-16", ru: "Отбор с оценкой по критериям, затем олимпийская сетка для топ-16", fr: "Tour de sélection avec notation par critères, puis bracket olympique", pt: "Rodada de seleção com critérios, depois chave olímpica para top-16" },
  "features.liveViz": { en: "Live Visualization", es: "Visualización en Vivo", ru: "Живая Визуализация", fr: "Visualisation en Direct", pt: "Visualização ao Vivo" },
  "features.liveVizDesc": { en: "Big screen display with vote animations and tournament bracket view", es: "Pantalla grande con animaciones de votos y vista de bracket", ru: "Большой экран с анимацией голосов и турнирной сеткой", fr: "Grand écran avec animations de votes et vue du bracket", pt: "Tela grande com animações de votos e visualização do chaveamento" },
  "features.fair": { en: "Fair Judging", es: "Jurado Justo", ru: "Честное Судейство", fr: "Jugement Équitable", pt: "Arbitragem Justa" },
  "features.fairDesc": { en: "Anonymous judge voting, automatic counting, no manipulation possible", es: "Votación anónima de jueces, conteo automático, sin manipulación", ru: "Анонимное голосование судей, автоматический подсчёт, без манипуляций", fr: "Vote anonyme, comptage automatique, pas de manipulation", pt: "Votação anônima, contagem automática, sem manipulação" },
  "features.control": { en: "Full Control", es: "Control Total", ru: "Полный Контроль", fr: "Contrôle Total", pt: "Controle Total" },
  "features.controlDesc": { en: "Operator panel for managing matches, rounds, and screen display", es: "Panel de operador para gestionar matches, rondas y pantalla", ru: "Панель оператора для управления матчами, раундами и экраном", fr: "Panel opérateur pour gérer les matchs, rounds et l'écran", pt: "Painel do operador para gerenciar partidas, rounds e tela" },

  // How it works
  "howItWorks.title": { en: "How It Works", es: "Cómo Funciona", ru: "Как Это Работает", fr: "Comment Ça Marche", pt: "Como Funciona" },
  "howItWorks.subtitle": { en: "Get your battle running in four simple steps", es: "Pon tu batalla en marcha en cuatro simples pasos", ru: "Запустите свой баттл за четыре простых шага", fr: "Lancez votre battle en quatre étapes simples", pt: "Comece sua batalha em quatro passos simples" },
  "howItWorks.step1": { en: "Create a Battle", es: "Crea una Batalla", ru: "Создайте Баттл", fr: "Créer un Battle", pt: "Criar uma Batalha" },
  "howItWorks.step1Desc": { en: "Set name, date, location and add categories (Solo, Doubles, Power Moves, etc.)", es: "Establece nombre, fecha, ubicación y agrega categorías", ru: "Задайте название, дату, место и добавьте категории", fr: "Définissez le nom, la date, le lieu et ajoutez des catégories", pt: "Defina nome, data, local e adicione categorias" },
  "howItWorks.step2": { en: "Build Your Team", es: "Construye tu Equipo", ru: "Соберите Команду", fr: "Constituez Votre Équipe", pt: "Monte sua Equipe" },
  "howItWorks.step2Desc": { en: "Invite judges and selectors. They can apply or you can add them directly.", es: "Invita jueces y selectores. Pueden postularse o puedes agregarlos.", ru: "Пригласите судей и селекторов. Они могут подать заявку или вы добавите их.", fr: "Invitez des juges et sélecteurs. Ils peuvent postuler ou vous les ajoutez.", pt: "Convide juízes e seletores. Eles podem se candidatar ou você os adiciona." },
  "howItWorks.step3": { en: "Run Selection", es: "Ejecutar Selección", ru: "Проведите Отбор", fr: "Lancer la Sélection", pt: "Executar Seleção" },
  "howItWorks.step3Desc": { en: "Judges rate dancers on technique, creativity, energy. Top performers advance.", es: "Los jueces califican en técnica, creatividad, energía. Los mejores avanzan.", ru: "Судьи оценивают танцоров по технике, креативности, энергии. Лучшие проходят.", fr: "Les juges notent technique, créativité, énergie. Les meilleurs avancent.", pt: "Juízes avaliam técnica, criatividade, energia. Os melhores avançam." },
  "howItWorks.step4": { en: "Battle Mode", es: "Modo Batalla", ru: "Режим Баттла", fr: "Mode Battle", pt: "Modo Batalha" },
  "howItWorks.step4Desc": { en: "Automatic seeding, live voting, audience visualization. Pure competition.", es: "Siembra automática, votación en vivo, visualización para el público.", ru: "Автоматическая жеребьёвка, живое голосование, визуализация для зрителей.", fr: "Seeding automatique, vote en direct, visualisation pour le public.", pt: "Sorteio automático, votação ao vivo, visualização para o público." },

  // CTA
  "cta.title": { en: "Ready to Battle?", es: "¿Listo para la Batalla?", ru: "Готовы к Баттлу?", fr: "Prêt pour le Battle?", pt: "Pronto para a Batalha?" },
  "cta.subtitle": { en: "Join the community of organizers using SWITCHBOARD for fair, transparent judging.", es: "Únete a la comunidad de organizadores que usan SWITCHBOARD.", ru: "Присоединяйтесь к организаторам, использующим SWITCHBOARD.", fr: "Rejoignez la communauté d'organisateurs utilisant SWITCHBOARD.", pt: "Junte-se à comunidade de organizadores usando SWITCHBOARD." },
  "cta.browse": { en: "Browse Battles", es: "Ver Batallas", ru: "Обзор Баттлов", fr: "Voir les Battles", pt: "Ver Batalhas" },
  "cta.startOrganizing": { en: "Start Organizing", es: "Empezar a Organizar", ru: "Начать Организацию", fr: "Commencer à Organiser", pt: "Começar a Organizar" },

  // Dashboard
  "dashboard.myBattles": { en: "My Battles", es: "Mis Batallas", ru: "Мои Баттлы", fr: "Mes Battles", pt: "Minhas Batalhas" },
  "dashboard.manage": { en: "Manage your events", es: "Gestiona tus eventos", ru: "Управляйте вашими событиями", fr: "Gérez vos événements", pt: "Gerencie seus eventos" },
  "dashboard.createBattle": { en: "Create Battle", es: "Crear Batalla", ru: "Создать Баттл", fr: "Créer un Battle", pt: "Criar Batalha" },
  "dashboard.noBattles": { en: "No battles yet", es: "Sin batallas aún", ru: "Пока нет баттлов", fr: "Pas encore de battles", pt: "Sem batalhas ainda" },
  "dashboard.noBattlesDesc": { en: "Create your first battle or find an event to join!", es: "¡Crea tu primera batalla o encuentra un evento!", ru: "Создайте свой первый баттл или найдите событие!", fr: "Créez votre premier battle ou trouvez un événement!", pt: "Crie sua primeira batalha ou encontre um evento!" },
  "dashboard.findBattles": { en: "Find Battles", es: "Buscar Batallas", ru: "Найти Баттлы", fr: "Trouver des Battles", pt: "Encontrar Batalhas" },
  "dashboard.judgePanel": { en: "Judge Panel", es: "Panel de Juez", ru: "Панель Судьи", fr: "Panel Juge", pt: "Painel do Juiz" },
  "dashboard.deleteBattle": { en: "Delete Battle?", es: "¿Eliminar Batalla?", ru: "Удалить Баттл?", fr: "Supprimer le Battle?", pt: "Excluir Batalha?" },
  "dashboard.deleteDesc": { en: "This will permanently delete", es: "Esto eliminará permanentemente", ru: "Это навсегда удалит", fr: "Cela supprimera définitivement", pt: "Isso excluirá permanentemente" },
  "dashboard.categories": { en: "categories", es: "categorías", ru: "категорий", fr: "catégories", pt: "categorias" },

  // Judge panel
  "judge.waiting": { en: "Waiting for Battle", es: "Esperando Batalla", ru: "Ожидание Баттла", fr: "En Attente du Battle", pt: "Aguardando Batalha" },
  "judge.waitingDesc": { en: "The operator will start the match soon. Stay ready!", es: "El operador iniciará la partida pronto. ¡Prepárate!", ru: "Оператор скоро начнёт матч. Будьте готовы!", fr: "L'opérateur va bientôt commencer le match. Restez prêt!", pt: "O operador iniciará a partida em breve. Fique pronto!" },
  "judge.voteSubmitted": { en: "Vote Submitted", es: "Voto Enviado", ru: "Голос Отправлен", fr: "Vote Soumis", pt: "Voto Enviado" },
  "judge.tapToVote": { en: "Tap to Vote", es: "Toca para Votar", ru: "Нажмите для Голосования", fr: "Appuyez pour Voter", pt: "Toque para Votar" },
  "judge.voteHistory": { en: "Vote History", es: "Historial de Votos", ru: "История Голосов", fr: "Historique des Votes", pt: "Histórico de Votos" },
  "judge.voteRecorded": { en: "Vote Recorded", es: "Voto Registrado", ru: "Голос Записан", fr: "Vote Enregistré", pt: "Voto Registrado" },
  "judge.waitingNext": { en: "Waiting for the next round...", es: "Esperando la siguiente ronda...", ru: "Ожидание следующего раунда...", fr: "En attente du prochain round...", pt: "Aguardando próxima rodada..." },
  "judge.undoVote": { en: "Undo / Change Vote", es: "Deshacer / Cambiar Voto", ru: "Отменить / Изменить Голос", fr: "Annuler / Changer le Vote", pt: "Desfazer / Mudar Voto" },
  "judge.submitScore": { en: "Submit Score", es: "Enviar Puntuación", ru: "Отправить Оценку", fr: "Soumettre le Score", pt: "Enviar Pontuação" },
  "judge.scoreRecorded": { en: "Score Recorded", es: "Puntuación Registrada", ru: "Оценка Записана", fr: "Score Enregistré", pt: "Pontuação Registrada" },
  "judge.schedule": { en: "Schedule", es: "Calendario", ru: "Расписание", fr: "Programme", pt: "Agenda" },
  "judge.newMatch": { en: "New Match Active!", es: "¡Nuevo Match Activo!", ru: "Новый Матч Активен!", fr: "Nouveau Match Actif!", pt: "Nova Partida Ativa!" },
  "judge.circleScored": { en: "Circle Scored", es: "Círculo Puntuado", ru: "Круг Оценён", fr: "Cercle Noté", pt: "Círculo Pontuado" },
  "judge.waitingHeat": { en: "Waiting for next heat...", es: "Esperando siguiente heat...", ru: "Ожидание следующего хита...", fr: "En attente du prochain heat...", pt: "Aguardando próximo heat..." },

  // Operator Panel
  "operator.settings": { en: "Settings", es: "Configuración", ru: "Настройки", fr: "Paramètres", pt: "Configurações" },
  "operator.display": { en: "Display", es: "Pantalla", ru: "Экран", fr: "Affichage", pt: "Exibição" },
  "operator.showBattleName": { en: "Show Battle Name", es: "Mostrar Nombre", ru: "Показать Название", fr: "Afficher le Nom", pt: "Mostrar Nome" },
  "operator.showJudges": { en: "Show Judges", es: "Mostrar Jueces", ru: "Показать Судей", fr: "Afficher les Juges", pt: "Mostrar Juízes" },
  "operator.showTimer": { en: "Show Timer", es: "Mostrar Timer", ru: "Показать Таймер", fr: "Afficher le Timer", pt: "Mostrar Timer" },
  "operator.showScore": { en: "Show Score", es: "Mostrar Puntuación", ru: "Показать Счёт", fr: "Afficher le Score", pt: "Mostrar Pontuação" },
  "operator.roundsToWin": { en: "Rounds to Win", es: "Rondas para Ganar", ru: "Раундов для Победы", fr: "Rounds pour Gagner", pt: "Rounds para Vencer" },
  "operator.applyDisplay": { en: "Apply Display", es: "Aplicar Pantalla", ru: "Применить", fr: "Appliquer", pt: "Aplicar" },
  "operator.theme": { en: "Theme", es: "Tema", ru: "Тема", fr: "Thème", pt: "Tema" },
  "operator.applyTheme": { en: "Apply Theme & Styles", es: "Aplicar Tema y Estilos", ru: "Применить Тему", fr: "Appliquer le Thème", pt: "Aplicar Tema" },
  "operator.message": { en: "Message", es: "Mensaje", ru: "Сообщение", fr: "Message", pt: "Mensagem" },
  "operator.showMessage": { en: "Show Message", es: "Mostrar Mensaje", ru: "Показать Сообщение", fr: "Afficher le Message", pt: "Mostrar Mensagem" },
  "operator.sendMessage": { en: "Send Message", es: "Enviar Mensaje", ru: "Отправить Сообщение", fr: "Envoyer le Message", pt: "Enviar Mensagem" },
  "operator.templates": { en: "Templates", es: "Plantillas", ru: "Шаблоны", fr: "Modèles", pt: "Modelos" },
  "operator.hideTemplate": { en: "Hide Template", es: "Ocultar Plantilla", ru: "Скрыть Шаблон", fr: "Masquer le Modèle", pt: "Ocultar Modelo" },
  "operator.screen": { en: "Screen", es: "Pantalla", ru: "Экран", fr: "Écran", pt: "Tela" },
  "operator.matchStarted": { en: "Match started", es: "Match iniciado", ru: "Матч начался", fr: "Match commencé", pt: "Partida iniciada" },
  "operator.matchLive": { en: "Match is now live", es: "El match está en vivo", ru: "Матч в прямом эфире", fr: "Le match est en direct", pt: "Partida ao vivo" },
  "operator.settingsApplied": { en: "Settings applied", es: "Configuración aplicada", ru: "Настройки применены", fr: "Paramètres appliqués", pt: "Configurações aplicadas" },
  "operator.designApplied": { en: "Design applied", es: "Diseño aplicado", ru: "Дизайн применён", fr: "Design appliqué", pt: "Design aplicado" },
  "operator.messageSent": { en: "Message sent", es: "Mensaje enviado", ru: "Сообщение отправлено", fr: "Message envoyé", pt: "Mensagem enviada" },
  "operator.audienceVoting": { en: "Audience Voting", es: "Votación del Público", ru: "Голосование Зрителей", fr: "Vote du Public", pt: "Votação do Público" },
  "operator.enableAudienceQR": { en: "Show QR on Screen", es: "Mostrar QR en Pantalla", ru: "Показать QR на Экране", fr: "Afficher QR à l'Écran", pt: "Mostrar QR na Tela" },
  "operator.autoAdvance": { en: "Auto-advance on timer end", es: "Auto-avanzar al terminar timer", ru: "Авто-переход при окончании таймера", fr: "Avancer auto à la fin du timer", pt: "Auto-avançar no fim do timer" },
  "operator.judgesStatus": { en: "Judges Status", es: "Estado de Jueces", ru: "Статус Судей", fr: "Statut des Juges", pt: "Status dos Juízes" },
  "operator.votes": { en: "votes", es: "votos", ru: "голосов", fr: "votes", pt: "votos" },
  "operator.liveHeat": { en: "LIVE HEAT", es: "HEAT EN VIVO", ru: "ХИТВОЙ", fr: "HEAT EN DIRECT", pt: "HEAT AO VIVO" },
  "operator.stopHeat": { en: "Stop Heat", es: "Detener Heat", ru: "Остановить Хит", fr: "Arrêter le Heat", pt: "Parar Heat" },
  "operator.timerEnded": { en: "Timer ended! Auto-advancing to next round...", es: "¡Timer terminado! Avanzando automáticamente...", ru: "Таймер завершён! Автопереход к следующему раунду...", fr: "Timer terminé! Passage automatique au round suivant...", pt: "Timer encerrado! Avançando automaticamente..." },
  
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

  // Battles List
  "battlesList.findBattle": { en: "Find Your Battle", es: "Encuentra tu Batalla", ru: "Найдите Свой Баттл", fr: "Trouvez Votre Battle", pt: "Encontre sua Batalha" },
  "battlesList.browseDesc": { en: "Browse upcoming breakdance events and register as a dancer", es: "Explora eventos de breakdance y regístrate como bailarín", ru: "Просмотрите предстоящие события и зарегистрируйтесь как танцор", fr: "Parcourez les événements et inscrivez-vous", pt: "Navegue por eventos e registre-se como dançarino" },
  "battlesList.searchPlaceholder": { en: "Search battles...", es: "Buscar batallas...", ru: "Поиск баттлов...", fr: "Rechercher des battles...", pt: "Buscar batalhas..." },
  "battlesList.upcoming": { en: "Upcoming Battles", es: "Próximas Batallas", ru: "Предстоящие Баттлы", fr: "Prochains Battles", pt: "Próximas Batalhas" },
  "battlesList.noUpcoming": { en: "No Upcoming Battles", es: "Sin Batallas Próximas", ru: "Нет Предстоящих Баттлов", fr: "Pas de Prochains Battles", pt: "Sem Batalhas Próximas" },
  "battlesList.checkBack": { en: "Check back soon for new events!", es: "¡Vuelve pronto para nuevos eventos!", ru: "Скоро появятся новые события!", fr: "Revenez bientôt pour de nouveaux événements!", pt: "Volte em breve para novos eventos!" },
  "battlesList.organizeBattle": { en: "Organize a Battle", es: "Organizar una Batalla", ru: "Организовать Баттл", fr: "Organiser un Battle", pt: "Organizar uma Batalha" },
  "battlesList.noResults": { en: "No Results", es: "Sin Resultados", ru: "Нет Результатов", fr: "Pas de Résultats", pt: "Sem Resultados" },
  "battlesList.pastBattles": { en: "Past Battles", es: "Batallas Pasadas", ru: "Прошедшие Баттлы", fr: "Battles Passés", pt: "Batalhas Passadas" },
  "battlesList.category": { en: "category", es: "categoría", ru: "категория", fr: "catégorie", pt: "categoria" },
  "battlesList.categories": { en: "categories", es: "categorías", ru: "категорий", fr: "catégories", pt: "categorias" },

  // Audience Vote
  "audience.title": { en: "Audience Vote", es: "Voto del Público", ru: "Голосование Зрителей", fr: "Vote du Public", pt: "Voto do Público" },
  "audience.noMatch": { en: "No active match right now. Stay tuned!", es: "No hay match activo. ¡Mantente atento!", ru: "Сейчас нет активного матча. Оставайтесь на связи!", fr: "Pas de match actif. Restez à l'écoute!", pt: "Sem partida ativa. Fique ligado!" },
  "audience.waitingMatch": { en: "Waiting for match...", es: "Esperando match...", ru: "Ожидание матча...", fr: "En attente du match...", pt: "Aguardando partida..." },
  "audience.alreadyVoted": { en: "You already voted for this match!", es: "¡Ya votaste en este match!", ru: "Вы уже проголосовали в этом матче!", fr: "Vous avez déjà voté!", pt: "Você já votou nesta partida!" },
  "audience.voteSubmitted": { en: "Vote submitted! 🎉", es: "¡Voto enviado! 🎉", ru: "Голос отправлен! 🎉", fr: "Vote soumis! 🎉", pt: "Voto enviado! 🎉" },
  "audience.vote": { en: "Vote", es: "Votar", ru: "Голосовать", fr: "Voter", pt: "Votar" },
  "audience.poweredBy": { en: "Powered by SWITCHBOARD", es: "Powered by SWITCHBOARD", ru: "Powered by SWITCHBOARD", fr: "Powered by SWITCHBOARD", pt: "Powered by SWITCHBOARD" },

  // World Events
  "worldEvents.title": { en: "Discover Battles Worldwide", es: "Descubre Batallas Mundialmente", ru: "Откройте Баттлы по Всему Миру", fr: "Découvrez les Battles dans le Monde", pt: "Descubra Batalhas pelo Mundo" },
  "worldEvents.subtitle": { en: "Find breaking, hip-hop, and street dance events happening around the globe.", es: "Encuentra eventos de breaking, hip-hop y danza urbana en todo el mundo.", ru: "Находите события брейкинга, хип-хопа и уличных танцев по всему миру.", fr: "Trouvez des événements de breaking, hip-hop et danse de rue.", pt: "Encontre eventos de breaking, hip-hop e dança urbana pelo mundo." },
  "worldEvents.globalEvents": { en: "Global Dance Events", es: "Eventos de Danza Globales", ru: "Мировые Танцевальные События", fr: "Événements de Danse Mondiaux", pt: "Eventos de Dança Globais" },
  "worldEvents.totalEvents": { en: "Total Events", es: "Total de Eventos", ru: "Всего Событий", fr: "Total Événements", pt: "Total de Eventos" },
  "worldEvents.upcoming": { en: "Upcoming", es: "Próximos", ru: "Предстоящие", fr: "À Venir", pt: "Próximos" },
  "worldEvents.liveNow": { en: "Live Now", es: "En Vivo", ru: "Сейчас Идёт", fr: "En Direct", pt: "Ao Vivo" },
  "worldEvents.countries": { en: "Countries", es: "Países", ru: "Стран", fr: "Pays", pt: "Países" },
  "worldEvents.myRegion": { en: "My Region", es: "Mi Región", ru: "Мой Регион", fr: "Ma Région", pt: "Minha Região" },
  "worldEvents.submitEvent": { en: "Submit Event", es: "Enviar Evento", ru: "Подать Событие", fr: "Soumettre un Événement", pt: "Enviar Evento" },

  // World Ranking
  "worldRanking.title": { en: "Dominance Graph", es: "Gráfico de Dominancia", ru: "Граф Доминации", fr: "Graphe de Dominance", pt: "Gráfico de Dominância" },
  "worldRanking.subtitle": { en: "Pure head-to-head PageRank", es: "PageRank directo head-to-head", ru: "Чистый PageRank по результатам баттлов", fr: "PageRank pur en head-to-head", pt: "PageRank puro head-to-head" },
  "worldRanking.quickStart": { en: "Quick Start", es: "Inicio Rápido", ru: "Быстрый Старт", fr: "Démarrage Rapide", pt: "Início Rápido" },
  "worldRanking.quickStartDesc": { en: "Generate demo data or add your own battles", es: "Genera datos demo o agrega tus propias batallas", ru: "Сгенерируйте демо-данные или добавьте свои баттлы", fr: "Générez des données démo ou ajoutez vos battles", pt: "Gere dados demo ou adicione suas batalhas" },
  "worldRanking.generateDemo": { en: "Demo", es: "Demo", ru: "Демо", fr: "Démo", pt: "Demo" },
  "worldRanking.reset": { en: "Reset", es: "Resetear", ru: "Сбросить", fr: "Réinitialiser", pt: "Resetar" },
  "worldRanking.addBattles": { en: "Add Battles", es: "Agregar Batallas", ru: "Добавить Баттлы", fr: "Ajouter des Battles", pt: "Adicionar Batalhas" },
  "worldRanking.recalculate": { en: "Recalculate", es: "Recalcular", ru: "Пересчитать", fr: "Recalculer", pt: "Recalcular" },
  "worldRanking.dancers": { en: "Dancers", es: "Bailarines", ru: "Танцоры", fr: "Danseurs", pt: "Dançarinos" },
  "worldRanking.battlesCount": { en: "Battles", es: "Batallas", ru: "Баттлы", fr: "Battles", pt: "Batalhas" },
  "worldRanking.tournaments": { en: "Tournaments", es: "Torneos", ru: "Турниры", fr: "Tournois", pt: "Torneios" },
  
  // Common
  "common.round": { en: "Round", es: "Ronda", ru: "Раунд", fr: "Manche", pt: "Rodada" },
  "common.vs": { en: "VS", es: "VS", ru: "VS", fr: "VS", pt: "VS" },
  "common.winner": { en: "Winner", es: "Ganador", ru: "Победитель", fr: "Gagnant", pt: "Vencedor" },
  "common.loading": { en: "Loading...", es: "Cargando...", ru: "Загрузка...", fr: "Chargement...", pt: "Carregando..." },
  "common.back": { en: "Back", es: "Atrás", ru: "Назад", fr: "Retour", pt: "Voltar" },
  "common.save": { en: "Save", es: "Guardar", ru: "Сохранить", fr: "Enregistrer", pt: "Salvar" },
  "common.cancel": { en: "Cancel", es: "Cancelar", ru: "Отмена", fr: "Annuler", pt: "Cancelar" },
  "common.submit": { en: "Submit", es: "Enviar", ru: "Отправить", fr: "Soumettre", pt: "Enviar" },
  "common.delete": { en: "Delete", es: "Eliminar", ru: "Удалить", fr: "Supprimer", pt: "Excluir" },
  "common.home": { en: "Home", es: "Inicio", ru: "Главная", fr: "Accueil", pt: "Início" },
  "common.open": { en: "Open", es: "Abierto", ru: "Открыто", fr: "Ouvert", pt: "Aberto" },
  "common.live": { en: "Live", es: "En Vivo", ru: "В Эфире", fr: "En Direct", pt: "Ao Vivo" },
  "common.completed": { en: "Completed", es: "Completado", ru: "Завершено", fr: "Terminé", pt: "Concluído" },
  "common.selection": { en: "Selection", es: "Selección", ru: "Отбор", fr: "Sélection", pt: "Seleção" },
  "common.match": { en: "Match", es: "Match", ru: "Матч", fr: "Match", pt: "Partida" },
  "common.noVotesYet": { en: "No votes yet", es: "Sin votos aún", ru: "Пока нет голосов", fr: "Pas encore de votes", pt: "Sem votos ainda" },
  "common.voted": { en: "Voted", es: "Votado", ru: "Проголосовал", fr: "Voté", pt: "Votado" },
  "common.pending": { en: "Pending", es: "Pendiente", ru: "Ожидание", fr: "En attente", pt: "Pendente" },
  "common.technique": { en: "Technique", es: "Técnica", ru: "Техника", fr: "Technique", pt: "Técnica" },
  "common.musicality": { en: "Musicality", es: "Musicalidad", ru: "Музыкальность", fr: "Musicalité", pt: "Musicalidade" },
  "common.performance": { en: "Performance", es: "Rendimiento", ru: "Перформанс", fr: "Performance", pt: "Performance" },
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
