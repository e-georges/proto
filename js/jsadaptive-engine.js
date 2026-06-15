/**
 * --- MOTEUR PÉDAGOGIQUE ADAPTATIF ITIL 5 ---
 * Gère l'évolution dynamique de la difficulté selon l'historique des réponses de l'apprenant.
 */

const AdaptiveState = {
    chapters: {}
};

function getOrCreateChapterState(chapitreId) {
    if (!AdaptiveState.chapters[chapitreId]) {
        AdaptiveState.chapters[chapitreId] = {
            niveau: 1,              
            historiqueCorrect: [],   
            historiqueIds: []       
        };
    }
    return AdaptiveState.chapters[chapitreId];
}

export function updateNiveauAdaptatif(chapitreId, isCorrect) {
    const state = getOrCreateChapterState(chapitreId);
    
    state.historiqueCorrect.push(isCorrect);
    
    if (state.historiqueCorrect.length > 3) {
        state.historiqueCorrect.shift();
    }

    let montee = false;
    let descente = false;

    // 3 succès d'affilée = augmentation de niveau
    if (state.historiqueCorrect.length === 3 && state.historiqueCorrect.every(res => res === true)) {
        if (state.niveau < 3) {
            state.niveau++;
            state.historiqueCorrect = []; 
            montee = true;
        }
    }
    
    // 2 erreurs parmi les 3 dernières réponses = rétrogradation de sécurité
    const mauvaisesReponses = state.historiqueCorrect.filter(res => res === false).length;
    if (mauvaisesReponses >= 2) {
        if (state.niveau > 1) {
            state.niveau--;
            state.historiqueCorrect = []; 
            descente = true;
        }
    }

    return {
        niveauActuel: state.niveau,
        montee,
        descente
    };
}

export function selectionnerQuestionsAdaptatives(toutesLesQuestions, chapitreId, limite = 5) {
    const state = getOrCreateChapterState(chapitreId);
    const niveauCible = state.niveau;

    let questionsFiltrees = toutesLesQuestions.filter(q => (q.difficulte || 1) === niveauCible);
    
    if (questionsFiltrees.length === 0) {
        questionsFiltrees = toutesLesQuestions;
    }

    let questionsDisponibles = questionsFiltrees.filter(q => !state.historiqueIds.includes(q.id));
    
    if (questionsDisponibles.length === 0) {
        state.historiqueIds = [];
        questionsDisponibles = questionsFiltrees;
    }

    const selection = questionsDisponibles
        .sort(() => Math.random() - 0.5)
        .slice(0, limite);

    selection.forEach(q => {
        if (q.id) {
            state.historiqueIds.push(q.id);
            if (state.historiqueIds.length > 10) state.historiqueIds.shift();
        }
    });

    return selection;
}

export function getNiveauActuel(chapitreId) {
    return getOrCreateChapterState(chapitreId).niveau;
}

export function getMessageMotivation(niveau) {
    const messages = {
        1: "Fondations ITIL 5 🎯 Validation des notions et définitions élémentaires.",
        2: "Scénarios Pratiques 🚀 Analyse de cas et d'applications d'écosystèmes.",
        3: "Niveau Examen Blanc 👑 Questions sémantiques officielles Axelos V5."
    };
    return messages[niveau] || "Préparation en cours...";
}
