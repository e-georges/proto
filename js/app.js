// --- APPLICATION DE RÉVISION ADAPTATIVE ITIL 5 ---
// L'import pointe strictement vers le fichier situé dans le même dossier js/
import { 
    updateNiveauAdaptatif, 
    selectionnerQuestionsAdaptatives, 
    getNiveauActuel, 
    getMessageMotivation 
} from './adaptive-engine.js'; 

const AppState = {
    data: null,
    profile: { username: "Professionnel IT", avatar: "👨‍💻", streak: 0 },
    progress: {},
    currentQuiz: { chapitreId: null, questions: [], currentIndex: 0, score: 0, modeInfini: false }
};

document.addEventListener("DOMContentLoaded", () => {
    initLocalStorage();
    loadPedagogicalData();
    setupEventListeners();
});

function initLocalStorage() {
    if (localStorage.getItem("itil_profile")) AppState.profile = JSON.parse(localStorage.getItem("itil_profile"));
    if (localStorage.getItem("itil_progress")) AppState.progress = JSON.parse(localStorage.getItem("itil_progress"));
    renderProfileUI();
}

async function loadPedagogicalData() {
    try {
        // Le fetch s'exécute depuis la racine (index.html) donc on pointe vers ./data/
        const response = await fetch('./data/troisieme.json');
        if (!response.ok) throw new Error("Fichier introuvable");
        AppState.data = await response.json();
        
        AppState.data.matieres.forEach(mat => {
            mat.chapitres.forEach(chap => {
                if (!AppState.progress[chap.id]) AppState.progress[chap.id] = "a_reviser";
            });
        });
    } catch (error) {
        console.error("Erreur de chargement des données pédagogiques :", error);
        const container = document.getElementById("app-view-container");
        if (container) {
            container.innerHTML = `<div class="card" style="color:var(--color-danger); text-align:center;">
                ⚠️ Impossible de charger le fichier de données (data/troisieme.json). Assurez-vous qu'il est présent.
            </div>`;
        }
        return;
    }
    
    buildNavigationMenu();
    renderDashboardHome();
    updateGlobalProgressRing();
}

function buildNavigationMenu() {
    const menu = document.getElementById("sidebar-menu");
    if (!menu) return;
    
    menu.innerHTML = "";
    
    // Bouton Accueil de la structure
    const liHome = document.createElement("li");
    liHome.innerHTML = `<a class="nav-item active" id="btn-home"><span>🏠</span><span>Syllabus Global</span></a>`;
    menu.appendChild(liHome);
    
    document.getElementById("btn-home").addEventListener("click", (e) => {
        document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
        e.currentTarget.classList.add("active");
        renderDashboardHome();
    });

    // Bouton Mode Infini (Séries de 15 questions)
    const liInfini = document.createElement("li");
    liInfini.innerHTML = `<a class="nav-item" id="btn-infini" style="margin-top: 10px; background: linear-gradient(135deg, var(--color-accent), var(--color-primary)); color: white; border-radius: var(--radius-btn);"><span>🔥</span><span>Examen Blanc (15 Q.)</span></a>`;
    menu.appendChild(liInfini);
    document.getElementById("btn-infini").addEventListener("click", startQuizInfini);
    
    // Génération dynamique des rubriques par Matière
    AppState.data.matieres.forEach(mat => {
        const li = document.createElement("li");
        li.innerHTML = `<a class="nav-item"><span>${mat.emoji}</span><span>${mat.label}</span></a>`;
        li.querySelector("a").addEventListener("click", (e) => {
            document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
            e.currentTarget.classList.add("active");
            renderMatiereView(mat.id);
        });
        menu.appendChild(li);
    });
}

function renderDashboardHome() {
    const container = document.getElementById("app-view-container");
    if (!container) return;

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
            <h2>Parcours de Préparation ITIL 5</h2>
            <button id="main-infini-btn" class="btn-primary">🚀 Lancer un Examen Blanc (15 Q.)</button>
        </div>
        
        ${AppState.data.pieges_classiques && AppState.data.pieges_classiques.length > 0 ? `
            <div class="tip-box">
                <strong>⚠️ Alerte Piège Examen :</strong> ${AppState.data.pieges_classiques[Math.floor(Math.random() * AppState.data.pieges_classiques.length)]}
            </div>
        ` : ''}
        
        <div class="matieres-grid" id="matieres-grid"></div>
    `;
    
    document.getElementById("main-infini-btn").addEventListener("click", startQuizInfini);
    
    const grid = document.getElementById("matieres-grid");
    AppState.data.matieres.forEach(mat => {
        const total = mat.chapitres ? mat.chapitres.length : 0;
        const acquis = mat.chapitres ? mat.chapitres.filter(c => AppState.progress[c.id] === "acquis").length : 0;
        const pct = total > 0 ? Math.round((acquis / total) * 100) : 0;

        const card = document.createElement("div");
        card.className = "card";
        card.style.borderLeft = `5px solid ${mat.couleur || 'var(--color-primary)'}`;
        card.innerHTML = `
            <div style="font-size: 1.5rem; margin-bottom: 8px;">${mat.emoji}</div>
            <h3>${mat.label}</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 6px 0 16px;">${total} module(s) d'évaluation adaptative</p>
            <div style="background: var(--border-color); height: 6px; border-radius: 3px; overflow: hidden;">
                <div style="background: ${mat.couleur || 'var(--color-primary)'}; width: ${pct}%; height: 100%; transition: width 0.4s ease;"></div>
            </div>
            <p style="font-size: 0.75rem; font-weight: 600; text-align: right; margin-top: 6px; color: var(--text-secondary);">${pct}% Maîtrisé</p>
        `;
        card.addEventListener("click", () => renderMatiereView(mat.id));
        grid.appendChild(card);
    });
}

function renderMatiereView(matId) {
    const mat = AppState.data.matieres.find(m => m.id === matId);
    if (!mat) return;
    
    const container = document.getElementById("app-view-container");
    if (!container) return;

    container.innerHTML = `
        <div style="margin-bottom: 24px;">
            <button id="back-btn" class="btn-primary" style="padding: 6px 14px; font-size: 0.85rem; margin-bottom: 14px;">← Retour au Tableau de Bord</button>
            <h2 style="display: flex; align-items: center; gap: 8px;"><span>${mat.emoji}</span> ${mat.label}</h2>
        </div>
        <div class="chapitres-list" style="display: flex; flex-direction: column; gap: 16px;"></div>
    `;
    
    document.getElementById("back-btn").addEventListener("click", renderDashboardHome);

    const list = container.querySelector(".chapitres-list");
    mat.chapitres.forEach(chapitre => {
        const stat = AppState.progress[chapitre.id] || "a_reviser";
        const currentNiveau = getNiveauActuel(chapitre.id);
        
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <span class="status-badge ${stat === 'acquis' ? 'status-done' : ''}" style="background-color: ${stat === 'acquis' ? 'var(--color-success)' : 'var(--status-todo)'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
                    ${stat === "acquis" ? "🟢 Validé" : "⚪ À Réviser"}
                </span>
                <span style="font-size: 0.8rem; padding: 2px 8px; background: #ecfeff; color: #0891b2; border-radius: 12px; font-weight: bold; border: 1px solid #cffafe;">
                    Difficulté Dynamique IA : Palier ${currentNiveau}/3
                </span>
            </div>
            <h4>${chapitre.titre}</h4>
            <p style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 8px; line-height: 1.4;">${chapitre.fiche}</p>
            
            ${chapitre.conseil_strategique ? `
                <div style="font-size: 0.8rem; color: #0f766e; background: #f0fdfa; padding: 10px; border-radius: 6px; margin-top: 12px; border-left: 3px solid #14b8a6;">
                    💡 <strong>Focus Examen :</strong> ${chapitre.conseil_strategique}
                </div>
            ` : ''}
            
            <div style="margin-top: 16px;">
                <button class="btn-quiz btn-primary" style="font-size: 0.85rem; width: 100%; padding: 10px;">🎯 Démarrer le Test Adaptatif (5 Q.)</button>
            </div>
        `;
        card.querySelector(".btn-quiz").addEventListener("click", () => startQuizAdaptatif(chapitre));
        list.appendChild(card);
    });
}

function startQuizAdaptatif(chapitre) {
    if (!chapitre.quiz || chapitre.quiz.length === 0) return alert("Aucun QCM disponible dans ce module.");
    
    // Sélection par filtre adaptatif (par défaut 5 questions)
    const questionsFiltrees = selectionnerQuestionsAdaptatives(chapitre.quiz, chapitre.id, 5);
    
    AppState.currentQuiz = { 
        chapitreId: chapitre.id, 
        questions: questionsFiltrees, 
        currentIndex: 0, 
        score: 0, 
        modeInfini: false 
    };
    
    showQuestion();
    document.getElementById("quiz-modal").classList.add("active");
}

function startQuizInfini() {
    let toutesLesQuestions = [];
    
    // 1. Rassemblement de l'intégralité des QCM de toutes les matières et chapitres
    AppState.data.matieres.forEach(m => { 
        m.chapitres.forEach(c => { 
            if (c.quiz) {
                toutesLesQuestions = toutesLesQuestions.concat(c.quiz);
            } 
        }); 
    });
    
    if (toutesLesQuestions.length === 0) {
        return alert("La banque de questions est vide.");
    }
    
    // 2. Mélange aléatoire (Shuffling) et extraction stricte de 15 questions
    const questionsMelangees = toutesLesQuestions.sort(() => Math.random() - 0.5);
    const islandsOf15 = questionsMelangees.slice(0, 15);
    
    // 3. Configuration du state pour l'examen blanc
    AppState.currentQuiz = { 
        chapitreId: "global_infini", 
        questions: islandsOf15, 
        currentIndex: 0, 
        score: 0, 
        modeInfini: true 
    };
    
    // 4. Lancement de l'affichage
    showQuestion();
    document.getElementById("quiz-modal").classList.add("active");
}

function showQuestion() {
    const q = AppState.currentQuiz.questions[AppState.currentQuiz.currentIndex];
    const infoNiveau = AppState.currentQuiz.modeInfini ? 2 : getNiveauActuel(AppState.currentQuiz.chapitreId);
    
    const progressHeader = document.getElementById("quiz-progress");
    if (AppState.currentQuiz.modeInfini) {
        progressHeader.innerHTML = `🔥 Examen Blanc Global — Q. ${AppState.currentQuiz.currentIndex + 1}/${AppState.currentQuiz.questions.length}<br><small style="color:var(--text-secondary); font-weight:normal;">Score actuel : ${AppState.currentQuiz.score} correct(s)</small>`;
    } else {
        progressHeader.innerHTML = `Niveau ${q.difficulte || infoNiveau}/3 — Q. ${AppState.currentQuiz.currentIndex + 1}/${AppState.currentQuiz.questions.length}<br><small style="color:var(--text-secondary); font-weight:normal;">${getMessageMotivation(q.difficulte || infoNiveau)}</small>`;
    }
        
    const questionTextEl = document.getElementById("quiz-question-text");
    questionTextEl.innerHTML = q.enonce;
    
    if (q.annale) {
        questionTextEl.innerHTML += `<br><span style="display:inline-block; margin-top:8px; font-size:0.75rem; background:var(--bg-app); padding:2px 6px; border-radius:4px; font-weight:600; color:var(--color-primary); border: 1px solid var(--border-color);">📋 Source : ${q.annale}</span>`;
    }

    document.getElementById("quiz-explanation").classList.add("hidden");
    document.getElementById("quiz-next-btn").classList.add("hidden");

    const container = document.getElementById("quiz-options-container");
    container.innerHTML = "";
    
    q.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "btn-option";
        btn.innerText = opt;
        
        btn.addEventListener("click", () => {
            // Désactiver toutes les options du QCM actuel après sélection
            Array.from(container.children).forEach(b => b.disabled = true);
            const isCorrect = (idx === q.bonne_reponse);
            
            if (isCorrect) { 
                btn.style.background = "#D1FAE5"; 
                btn.style.borderColor = "#10B981"; 
                btn.style.color = "#064E3B";
                AppState.currentQuiz.score++; 
            } else { 
                btn.style.background = "#FEE2E2"; 
                btn.style.borderColor = "#EF4444"; 
                btn.style.color = "#7F1D1D";
                // Révéler la bonne réponse en vert
                if (container.children[q.bonne_reponse]) {
                    container.children[q.bonne_reponse].style.background = "#D1FAE5";
                    container.children[q.bonne_reponse].style.borderColor = "#10B981";
                    container.children[q.bonne_reponse].style.color = "#064E3B";
                }
            }
            
            // Si on est en mode adaptatif (pas l'examen blanc global), on ajuste le niveau de l'IA
            if (!AppState.currentQuiz.modeInfini) {
                const action = updateNiveauAdaptatif(AppState.currentQuiz.chapitreId, isCorrect);
                if (action.montee) showToast("🚀 Performance excellente ! Augmentation de la difficulté.");
                if (action.descente) showToast("📉 Besoin de consolidation. Ajustement du niveau.");
            }
            
            document.getElementById("explanation-text").innerText = q.explication;
            document.getElementById("quiz-explanation").classList.remove("hidden");
            document.getElementById("quiz-next-btn").classList.remove("hidden");
        });
        container.appendChild(btn);
    });
}

document.getElementById("quiz-next-btn").addEventListener("click", () => {
    AppState.currentQuiz.currentIndex++;
    if (AppState.currentQuiz.currentIndex < AppState.currentQuiz.questions.length) {
        showQuestion();
    } else {
        // Traitement de fin de quiz
        if (!AppState.currentQuiz.modeInfini && AppState.currentQuiz.score >= 4) {
            AppState.progress[AppState.currentQuiz.chapitreId] = "acquis";
            localStorage.setItem("itil_progress", JSON.stringify(AppState.progress));
        }
        
        alert(`Évaluation terminée ! Votre score : ${AppState.currentQuiz.score} / ${AppState.currentQuiz.questions.length}`);
        document.getElementById("quiz-modal").classList.remove("active");
        renderDashboardHome();
        updateGlobalProgressRing();
    }
});

function showToast(message) {
    const toast = document.createElement("div");
    toast.style.position = "fixed"; 
    toast.style.bottom = "80px"; 
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)"; 
    toast.style.background = "#1E293B";
    toast.style.color = "white"; 
    toast.style.padding = "12px 24px"; 
    toast.style.borderRadius = "30px";
    toast.style.fontSize = "0.85rem"; 
    toast.style.zIndex = "10000";
    toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function updateGlobalProgressRing() {
    const circle = document.getElementById("global-progress-circle");
    if (!circle) return;
    const circumference = 52 * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    
    const total = AppState.data && AppState.data.matieres ? AppState.data.matieres.reduce((acc, m) => acc + (m.chapitres ? m.chapitres.length : 0), 0) : 0;
    const acquis = Object.values(AppState.progress).filter(v => v === "acquis").length;
    const pct = total > 0 ? Math.round((acquis / total) * 100) : 0;
    
    circle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
    const textPercent = document.getElementById("global-progress-percent");
    if (textPercent) textPercent.innerText = pct;
}

function renderProfileUI() {
    if (document.getElementById("display-username")) document.getElementById("display-username").innerText = AppState.profile.username;
    if (document.getElementById("welcome-name")) document.getElementById("welcome-name").innerText = AppState.profile.username;
}

function setupEventListeners() {
    const toggle = () => document.body.classList.toggle("dark-mode");
    if (document.getElementById("theme-toggle")) document.getElementById("theme-toggle").addEventListener("click", toggle);
    if (document.getElementById("theme-toggle-mobile")) document.getElementById("theme-toggle-mobile").addEventListener("click", toggle);
    
    const closeBtn = document.getElementById("quiz-close-btn");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            if (confirm("Voulez-vous vraiment quitter ce test en cours ?")) {
                document.getElementById("quiz-modal").classList.remove("active");
                renderDashboardHome();
            }
        });
    }
}
