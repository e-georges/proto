/**
 * --- ORCHESTRATEUR PRINCIPAL ITIL 5 ---
 * Gère le routage virtuel, le chargement JSON sécurisé et les scores.
 */
import { 
    updateNiveauAdaptatif, 
    selectionnerQuestionsAdaptatives, 
    getNiveauActuel, 
    getMessageMotivation 
} from './adaptive-engine.js';

const AppState = {
    data: null,
    profile: {
        username: "Expert ITIL 5",
        avatar: "👨‍💻",
        streak: 5
    },
    progress: {}, 
    currentQuiz: {
        chapitreId: null,
        questions: [],
        currentIndex: 0,
        score: 0,
        modeInfini: false
    }
};

document.addEventListener("DOMContentLoaded", () => {
    initLocalStorage();
    loadPedagogicalData();
    setupEventListeners();
});

function initLocalStorage() {
    if (localStorage.getItem("itil_profile")) {
        AppState.profile = JSON.parse(localStorage.getItem("itil_profile"));
    } else {
        localStorage.setItem("itil_profile", JSON.stringify(AppState.profile));
    }

    if (localStorage.getItem("itil_progress")) {
        AppState.progress = JSON.parse(localStorage.getItem("itil_progress"));
    }
    renderProfileUI();
}

async function loadPedagogicalData() {
    try {
        // Chemin relatif explicite sécurisé pour contrer l'erreur 404 de GitHub Pages
        const response = await fetch('./data/troisieme.json');
        if (!response.ok) throw new Error("Fichier JSON introuvable ou corrompu.");
        AppState.data = await response.json();
        
        AppState.data.matieres.forEach(mat => {
            mat.chapitres.forEach(chap => {
                if (!AppState.progress[chap.id]) {
                    AppState.progress[chap.id] = "a_reviser";
                }
            });
        });
        localStorage.setItem("itil_progress", JSON.stringify(AppState.progress));

    } catch (error) {
        console.error("Erreur de chargement pédagogique :", error);
        document.getElementById("app-view-container").innerHTML = `
            <div style="color:var(--color-danger); text-align:center; padding:20px;">
                ⚠️ Impossible de charger la base de données ITIL 5. Vérifiez la casse de votre dossier (data/).
            </div>
        `;
        return;
    }

    buildNavigationMenu();
    renderDashboardHome();
    updateGlobalProgressRing();
}

function buildNavigationMenu() {
    const menu = document.getElementById("sidebar-menu");
    if (!menu) return;

    menu.innerHTML = `
        <li>
            <a class="nav-item active" id="btn-home">
                <span>🏠</span><span>Vue d'ensemble</span>
            </a>
        </li>
        <li>
            <a class="nav-item" id="btn-infini" style="background: linear-gradient(135deg, var(--color-accent), var(--color-primary)); color: white; margin-top: 12px; border-radius:8px;">
                <span>🔥</span><span>EXAMEN BLANC</span>
            </a>
        </li>
    `;

    document.getElementById("btn-home").addEventListener("click", (e) => {
        switchActiveNavItem(e.currentTarget);
        renderDashboardHome();
    });

    document.getElementById("btn-infini").addEventListener("click", startQuizInfini);

    AppState.data.matieres.forEach(mat => {
        const li = document.createElement("li");
        li.innerHTML = `
            <a class="nav-item" data-id="${mat.id}">
                <span>${mat.emoji}</span><span>${mat.label}</span>
            </a>
        `;
        li.querySelector("a").addEventListener("click", (e) => {
            switchActiveNavItem(e.currentTarget);
            renderMatiereView(mat.id);
        });
        menu.appendChild(li);
    });
}

function switchActiveNavItem(targetElement) {
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
    targetElement.classList.add("active");
}

function renderDashboardHome() {
    const container = document.getElementById("app-view-container");
    
    const piegeAlerte = AppState.data.pieges_classiques 
        ? AppState.data.pieges_classiques[Math.floor(Math.random() * AppState.data.pieges_classiques.length)]
        : "Restez concentrés sur le glossaire officiel ITIL 5.";

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap:wrap; gap:12px;">
            <div>
                <h2>Piliers de Certification ITIL 5</h2>
                <p style="color: var(--text-secondary); font-size:0.9rem;">Sélectionnez une discipline pour lancer l'apprentissage adaptatif.</p>
            </div>
            <button id="main-infini-btn" class="btn-primary">🚀 Examen Aléatoire Complet</button>
        </div>
        
        <div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid var(--color-warning); padding: 16px; border-radius: 8px; margin-bottom: 28px; font-size: 0.9rem; color: var(--text-primary); line-height:1.4;">
            <strong>⚠️ Piège Examen ITIL 5 :</strong> ${piegeAlerte}
        </div>

        <div class="matieres-grid" id="matieres-grid"></div>
    `;

    document.getElementById("main-infini-btn").addEventListener("click", startQuizInfini);

    const grid = document.getElementById("matieres-grid");
    AppState.data.matieres.forEach(mat => {
        const totalModules = mat.chapitres?.length || 0;
        const modulesAcquis = mat.chapitres?.filter(c => AppState.progress[c.id] === "acquis").length || 0;
        const pourcentage = totalModules > 0 ? Math.round((modulesAcquis / totalModules) * 100) : 0;

        const card = document.createElement("div");
        card.className = "card";
        card.style.borderLeft = `5px solid ${mat.couleur}`;
        card.innerHTML = `
            <h3 style="margin-bottom: 6px;">${mat.emoji} ${mat.label}</h3>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom: 16px;">${totalModules} module(s) d'évaluation</p>
            <div style="margin-top:auto;">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px; font-weight:600;">
                    <span>Niveau de Maîtrise</span><span>${pourcentage}%</span>
                </div>
                <div style="background:var(--border-color); height:6px; border-radius:3px; overflow:hidden;">
                    <div style="background:${mat.couleur}; width:${pourcentage}%; height:100%; transition: width 0.4s ease;"></div>
                </div>
            </div>
        `;
        card.addEventListener("click", () => {
            const navLink = document.querySelector(`.nav-item[data-id="${mat.id}"]`);
            if(navLink) switchActiveNavItem(navLink);
            renderMatiereView(mat.id);
        });
        grid.appendChild(card);
    });
}

function renderMatiereView(matId) {
    const mat = AppState.data.matieres.find(m => m.id === matId);
    if (!mat) return;

    const container = document.getElementById("app-view-container");
    container.innerHTML = `
        <div style="margin-bottom:24px;">
            <button id="back-btn" class="btn-primary" style="padding:8px 16px; font-size:0.85rem;">← Retour</button>
            <h2 style="margin-top:20px; display:flex; align-items:center; gap:10px;">
                <span>${mat.emoji}</span> <span>${mat.label}</span>
            </h2>
        </div>
        <div class="chapitres-list"></div>
    `;
    document.getElementById("back-btn").addEventListener("click", () => {
        const homeBtn = document.getElementById("btn-home");
        if(homeBtn) switchActiveNavItem(homeBtn);
        renderDashboardHome();
    });

    const list = container.querySelector(".chapitres-list");
    mat.chapitres.forEach(chapitre => {
        const statut = AppState.progress[chapitre.id] || "a_reviser";
        const niveauAdaptatif = getNiveauActuel(chapitre.id);

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
                <span class="status-badge status-${statut}">
                    ${statut === "acquis" ? "🟢 Validé" : "⚪ À travailler"}
                </span>
                <span style="font-size:0.75rem; padding:4px 10px; background:rgba(6, 182, 212, 0.1); color:var(--color-accent); border-radius:12px; font-weight:700;">
                    Palier IA : ${niveauAdaptatif}/3
                </span>
            </div>
            <h4 style="font-size:1.05rem; margin-bottom:8px;">${chapitre.titre}</h4>
            <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4; margin-bottom:12px;">${chapitre.fiche}</p>
            
            <div style="font-size:0.8rem; color:#0F766E; background:rgba(16, 185, 129, 0.08); padding:10px; border-radius:6px; margin-bottom:18px; border-left:3px solid var(--color-success)">
                💡 <strong>Stratégie Examen :</strong> ${chapitre.conseil_strategique}
            </div>
            
            <div style="margin-top:auto;">
                <button class="btn-quiz btn-primary" style="width:100%; font-size:0.85rem; padding:10px;">🎯 Lancer le Test Évolutif</button>
            </div>
        `;
        card.querySelector(".btn-quiz").addEventListener("click", () => startQuizAdaptatif(chapitre));
        list.appendChild(card);
    });
}

function startQuizAdaptatif(chapitre) {
    if (!chapitre.quiz || chapitre.quiz.length === 0) return alert("Aucun QCM disponible.");
    
    const questionsSelectionnees = selectionnerQuestionsAdaptatives(chapitre.quiz, chapitre.id, 5);

    // FIX : Suppression du point en trop devant chapitre.id
    AppState.currentQuiz = {
        chapitreId: chapitre.id,
        questions: questionsSelectionnees,
        currentIndex: 0,
        score: 0,
        modeInfini: false
    };

    showQuestion();
    document.getElementById("quiz-modal").classList.add("active");
}

function startQuizInfini() {
    let banqueGlobale = [];
    AppState.data.matieres.forEach(m => {
        m.chapitres.forEach(c => {
            if (c.quiz) banqueGlobale = banqueGlobale.concat(c.quiz);
        });
    });

    if (banqueGlobale.length === 0) return alert("Aucune question globale disponible.");

    AppState.currentQuiz = {
        chapitreId: "global_examen_blanc",
        questions: banqueGlobale.sort(() => Math.random() - 0.5),
        currentIndex: 0,
        score: 0,
        modeInfini: true
    };

    showQuestion();
    document.getElementById("quiz-modal").classList.add("active");
}

function showQuestion() {
    const quiz = AppState.currentQuiz;
    const q = quiz.questions[quiz.currentIndex];
    const niveauChapitre = getNiveauActuel(quiz.chapitreId);

    const progressHeader = document.getElementById("quiz-progress");
    const questionText = document.getElementById("quiz-question-text");
    const optionsContainer = document.getElementById("quiz-options-container");
    const explanationBox = document.getElementById("quiz-explanation");
    const nextBtn = document.getElementById("quiz-next-btn");

    if (quiz.modeInfini) {
        progressHeader.innerHTML = `🔥 Examen Blanc Complet — ${quiz.currentIndex + 1}/${quiz.questions.length} | Note : ${quiz.score}/${quiz.currentIndex}`;
    } else {
        progressHeader.innerHTML = `
            Difficulté : ${q.difficulte || niveauChapitre}/3 — Q. ${quiz.currentIndex + 1}/${quiz.questions.length}
            <br><small style="color:var(--text-secondary); font-weight:normal; font-size:0.75rem;">${getMessageMotivation(q.difficulte || niveauChapitre)}</small>
        `;
    }

    questionText.innerHTML = q.enonce;
    if (q.annale) {
        questionText.innerHTML += `<br><span style="display:inline-block; margin-top:8px; font-size:0.75rem; background:var(--bg-app); border:1px solid var(--border-color); padding:3px 8px; border-radius:4px; font-weight:500; color:var(--text-secondary);">📋 Référentiel : ${q.annale}</span>`;
    }

    explanationBox.classList.add("hidden");
    nextBtn.classList.add("hidden");
    optionsContainer.innerHTML = "";

    q.options.forEach((optionText, index) => {
        const btn = document.createElement("button");
        btn.className = "btn-option";
        btn.innerText = optionText;

        btn.addEventListener("click", () => {
            Array.from(optionsContainer.children).forEach(button => button.disabled = true);

            const isCorrect = (index === q.bonne_reponse);

            if (isCorrect) {
                btn.style.background = "#D1FAE5";
                btn.style.borderColor = "var(--color-success)";
                btn.style.color = "#064E3B";
                quiz.score++;
            } else {
                btn.style.background = "#FEE2E2";
                btn.style.borderColor = "var(--color-danger)";
                btn.style.color = "#7F1D1D";
                
                const correctBtn = optionsContainer.children[q.bonne_reponse];
                correctBtn.style.background = "#D1FAE5";
                correctBtn.style.borderColor = "var(--color-success)";
                correctBtn.style.color = "#064E3B";
            }

            if (!quiz.modeInfini) {
                updateNiveauAdaptatif(quiz.chapitreId, isCorrect);
            }

            document.getElementById("explanation-text").innerText = q.explication;
            explanationBox.classList.remove("hidden");
            nextBtn.classList.remove("hidden");
            
            document.querySelector(".modal-content").scrollTo({ top: explanationBox.offsetTop, behavior: 'smooth' });
        });

        optionsContainer.appendChild(btn);
    });
}

document.getElementById("quiz-next-btn").addEventListener("click", () => {
    const quiz = AppState.currentQuiz;
    quiz.currentIndex++;

    if (quiz.currentIndex < quiz.questions.length) {
        showQuestion();
    } else {
        if (!quiz.modeInfini) {
            if (quiz.score >= 4) {
                AppState.progress[quiz.chapitreId] = "acquis";
            }
            localStorage.setItem("itil_progress", JSON.stringify(AppState.progress));
        }

        alert(`Session terminée ! Note : ${quiz.score} / ${quiz.questions.length}`);
        document.getElementById("quiz-modal").classList.remove("active");
        
        renderDashboardHome();
        updateGlobalProgressRing();
    }
});

function updateGlobalProgressRing() {
    const circle = document.getElementById("global-progress-circle");
    if (!circle) return;

    const r = 52;
    const circonference = r * 2 * Math.PI;
    circle.style.strokeDasharray = `${circonference} ${circonference}`;
    
    const totalModules = Object.keys(AppState.progress).length;
    const modulesAcquis = Object.values(AppState.progress).filter(status => status === "acquis").length;
    
    const pourcentage = totalModules > 0 ? Math.round((modulesAcquis / totalModules) * 100) : 0;
    circle.style.strokeDashoffset = circonference - (pourcentage / 100) * circonference;
    document.getElementById("global-progress-percent").innerText = pourcentage;
}

function renderProfileUI() {
    document.getElementById("display-username").innerText = AppState.profile.username;
    document.getElementById("welcome-name").innerText = AppState.profile.username;
    document.getElementById("display-streak").innerText = AppState.profile.streak;
}

function setupEventListeners() {
    const closeBtn = document.getElementById("quiz-close-btn");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            if(confirm("Quitter le test ?")) {
                document.getElementById("quiz-modal").classList.remove("active");
                renderDashboardHome();
                updateGlobalProgressRing();
            }
        });
    }

    const toggleDarkMode = () => {
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        document.getElementById("theme-toggle").innerText = isDark ? "☀️" : "🌙";
        document.getElementById("theme-toggle-mobile").innerText = isDark ? "☀️" : "🌙";
    };

    document.getElementById("theme-toggle").addEventListener("click", toggleDarkMode);
    document.getElementById("theme-toggle-mobile").addEventListener("click", toggleDarkMode);
}
