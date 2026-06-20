// ==========================================================================
// RévisBrevet 2026 — app.js (SOFT UI EVOLUTION EDITION — v6.0 ARCHITECTURE COUVERTURE PILOTÉE)
// ==========================================================================

const AppState = {
  data: null,
  leitner: {},          // Acquis / mémorisation (boîtes Leitner), indexé par id de CHAPITRE
  progression: {},       // Progression / effort (niveaux explorés + exercice fait), indexé par id de CHAPITRE
  historiqueQuestions: [],
  quiz: {
    chapitreId: null,
    questions: [],
    idx: 0,
    score: 0,
    isAutomatisme: false,
    niveauFiltre: 1
  }
};

const $ = id => document.getElementById(id);

const DATA_SECOURS = {
  matieres: [
    {
      id: "maths",
      label: "Mathématiques",
      emoji: "📐",
      categorie: "Logique & Calcul",
      chapitres: [
        {
          id: "fractions",
          titre: "Calculs avec des fractions",
          theme: "Nombres",
          cours: "Pour additionner ou soustraire deux fractions, il faut les mettre au même dénominateur. Pour multiplier, on multiplie les numérateurs entre eux et les dénominateurs entre eux.",
          piege: "Oublier la priorité opératoire de la multiplication sur l'addition !"
        }
      ]
    }
  ]
};

// Dictionnaire des SVG remplaçant les émojis dans l'interface — clés alignées sur les vrais id de matières du JSON
const SVGMappings = {
  "maths": `<svg viewBox="0 0 24 24"><path d="M22 10v4h-6v6h-4v-6H6v-4h6V4h4v6h6z"/></svg>`,
  "francais": `<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  "histoire_geo": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>`,
  "emc": `<svg viewBox="0 0 24 24"><path d="M12 2L3 7v2h18V7l-9-5z"/><path d="M5 10v9M9 10v9M15 10v9M19 10v9M3 21h18"/></svg>`,
  "sciences": `<svg viewBox="0 0 24 24"><path d="M9 2v6L4 18a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L15 8V2"/><path d="M9 2h6"/></svg>`
};

function obtenirQuestionsFiltrees(pool, quantite) {
  let questionsDisponibles = pool.filter(q => !AppState.historiqueQuestions.includes(q.enonce));
  if (questionsDisponibles.length < quantite) {
    AppState.historiqueQuestions = AppState.historiqueQuestions.filter(enonce => !pool.some(q => q.enonce === enonce));
    questionsDisponibles = pool;
  }
  const selectionnees = shuffleArr(questionsDisponibles).slice(0, quantite);
  selectionnees.forEach(q => AppState.historiqueQuestions.push(q.enonce));
  if (AppState.historiqueQuestions.length > 50) AppState.historiqueQuestions.shift();
  localStorage.setItem('dnb_history_anti_repeat', JSON.stringify(AppState.historiqueQuestions));
  return selectionnees;
}

// ==========================================================================
// 🎲 GÉNÉRATEURS « AUTOMATISMES » — pool de plusieurs types (mode Automatismes uniquement)
// ==========================================================================

function genPourcentage() {
  const pList = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75];
  const vList = [30, 40, 50, 60, 80, 100, 120, 150, 200, 300, 400, 500];
  const p = pList[Math.floor(Math.random() * pList.length)];
  const v = vList[Math.floor(Math.random() * vList.length)];
  const res = parseFloat(((p * v) / 100).toFixed(2));

  const enonce = `Calculer ${p}% de ${v} €.`;
  const bonneReponse = `${res} €`;
  const explication = `Prendre ${p}%, revient à calculer (${p} × ${v}) / 100 = ${res} €.`;

  const options = [bonneReponse, `${parseFloat((res + (v * 0.05)).toFixed(2))} €`, `${res - 2 > 0 ? parseFloat((res - 2).toFixed(2)) : parseFloat((res + 10).toFixed(2))} €`, `${parseFloat((res * 1.5).toFixed(2))} €`];
  const shuffled = shuffleArr([...new Set(options)]);
  return { enonce, options: shuffled, bonne_reponse: shuffled.indexOf(bonneReponse), explication };
}

function genConversion() {
  const familles = [
    { unites: ['km', 'm'], facteur: 1000 },
    { unites: ['m', 'cm'], facteur: 100 },
    { unites: ['cm', 'mm'], facteur: 10 },
    { unites: ['kg', 'g'], facteur: 1000 },
    { unites: ['g', 'mg'], facteur: 1000 },
    { unites: ['L', 'mL'], facteur: 1000 },
    { unites: ['h', 'min'], facteur: 60 },
    { unites: ['min', 's'], facteur: 60 }
  ];
  const f = familles[Math.floor(Math.random() * familles.length)];
  const sensDirect = Math.random() < 0.5;
  const valeurDepart = [2, 3, 4, 5, 6, 7, 8, 1.5, 2.5][Math.floor(Math.random() * 9)];

  let bonneVal, uniteDepart, uniteArrivee;
  if (sensDirect) {
    uniteDepart = f.unites[0]; uniteArrivee = f.unites[1];
    bonneVal = parseFloat((valeurDepart * f.facteur).toFixed(3));
  } else {
    uniteDepart = f.unites[1]; uniteArrivee = f.unites[0];
    bonneVal = parseFloat((valeurDepart / f.facteur).toFixed(4));
  }

  const enonce = `Convertir ${valeurDepart} ${uniteDepart} en ${uniteArrivee}.`;
  const bonneReponse = `${bonneVal} ${uniteArrivee}`;
  const leurres = [
    `${parseFloat((bonneVal * 10).toFixed(4))} ${uniteArrivee}`,
    `${parseFloat((bonneVal / 10).toFixed(4))} ${uniteArrivee}`,
    `${valeurDepart} ${uniteArrivee}`
  ];
  const options = shuffleArr([...new Set([bonneReponse, ...leurres])]);
  return {
    enonce, options, bonne_reponse: options.indexOf(bonneReponse),
    explication: `1 ${f.unites[0]} = ${f.facteur} ${f.unites[1]}, donc on ${sensDirect ? 'multiplie' : 'divise'} par ${f.facteur}.`
  };
}

function genOrdreDeGrandeur() {
  const a = [18, 21, 32, 48, 55, 79, 103, 198, 305][Math.floor(Math.random() * 9)];
  const b = [9, 11, 19, 22, 31, 48, 52][Math.floor(Math.random() * 7)];
  const op = Math.random() < 0.5 ? '×' : '+';
  const arrondiA = Math.round(a / 10) * 10;
  const arrondiB = Math.round(b / 10) * 10;
  const exact = op === '×' ? a * b : a + b;
  const estimation = op === '×' ? arrondiA * arrondiB : arrondiA + arrondiB;

  const enonce = `Sans calculatrice, quel est l'ordre de grandeur de ${a} ${op} ${b} ?`;
  const bonneReponse = `Environ ${estimation}`;
  const leurres = [`Environ ${estimation * 10}`, `Environ ${Math.round(estimation / 10)}`, `Environ ${exact + (op === '×' ? 50 : 5)}`];
  const options = shuffleArr([...new Set([bonneReponse, ...leurres])]);
  return {
    enonce, options, bonne_reponse: options.indexOf(bonneReponse),
    explication: `En arrondissant ${a} en ${arrondiA} et ${b} en ${arrondiB}, on obtient rapidement environ ${estimation} (valeur exacte : ${exact}).`
  };
}

function genPrioritesOperatoires() {
  const a = Math.floor(Math.random() * 9) + 2;
  const b = Math.floor(Math.random() * 9) + 2;
  const c = Math.floor(Math.random() * 9) + 2;
  const formeAvecParentheses = Math.random() < 0.5;

  let enonce, resultat, piege;
  if (formeAvecParentheses) {
    resultat = (a + b) * c;
    piege = a + b * c;
    enonce = `Calculer : (${a} + ${b}) × ${c}`;
  } else {
    resultat = a + b * c;
    piege = (a + b) * c;
    enonce = `Calculer : ${a} + ${b} × ${c}`;
  }

  const bonneReponse = `${resultat}`;
  const leurres = [`${piege}`, `${resultat + 1}`, `${resultat - c}`];
  const options = shuffleArr([...new Set([bonneReponse, ...leurres])]);
  return {
    enonce, options, bonne_reponse: options.indexOf(bonneReponse),
    explication: formeAvecParentheses
      ? `Les parenthèses se calculent en premier : (${a}+${b}) = ${a + b}, puis × ${c} = ${resultat}.`
      : `La multiplication est prioritaire sur l'addition : ${b}×${c} = ${b * c}, puis ${a} + ${b * c} = ${resultat}.`
  };
}

function genProportionnalite() {
  const prixUnitaire = [2, 3, 4, 5, 6, 8][Math.floor(Math.random() * 6)];
  const qteRef = [3, 4, 5, 6][Math.floor(Math.random() * 4)];
  const qteCherchee = [7, 9, 10, 12, 15][Math.floor(Math.random() * 5)];
  const totalRef = prixUnitaire * qteRef;
  const resultat = parseFloat(((totalRef / qteRef) * qteCherchee).toFixed(2));

  const enonce = `${qteRef} articles identiques coûtent ${totalRef} €. Combien coûtent ${qteCherchee} de ces articles (même prix unitaire) ?`;
  const bonneReponse = `${resultat} €`;
  const leurres = [
    `${parseFloat((resultat + totalRef * 0.1).toFixed(2))} €`,
    `${parseFloat((totalRef + qteCherchee).toFixed(2))} €`,
    `${parseFloat((resultat - prixUnitaire).toFixed(2))} €`
  ];
  const options = shuffleArr([...new Set([bonneReponse, ...leurres])]);
  return {
    enonce, options, bonne_reponse: options.indexOf(bonneReponse),
    explication: `Le prix d'un article est ${totalRef}/${qteRef} = ${prixUnitaire} €. Pour ${qteCherchee} articles : ${prixUnitaire} × ${qteCherchee} = ${resultat} €.`
  };
}

const GENERATEURS_AUTOMATISMES = [genPourcentage, genConversion, genOrdreDeGrandeur, genPrioritesOperatoires, genProportionnalite];

function genererQuestionAutomatisme() {
  const fn = GENERATEURS_AUTOMATISMES[Math.floor(Math.random() * GENERATEURS_AUTOMATISMES.length)];
  return fn();
}

// ==========================================================================
// ⏱️ TIMER (mode Automatismes uniquement)
// ==========================================================================

let timerInterval = null;
let tempsRestant = 45;

function lancerTimer() {
  clearInterval(timerInterval);
  tempsRestant = 45;
  $('quiz-timer').style.display = 'inline-flex';
  $('quiz-timer').textContent = `⏱️ ${tempsRestant}s`;
  $('quiz-timer').style.background = '#E2E8F0';
  $('quiz-timer').style.color = 'var(--text-primary)';

  timerInterval = setInterval(() => {
    tempsRestant--;
    $('quiz-timer').textContent = `⏱️ ${tempsRestant}s`;
    if (tempsRestant <= 10) {
      $('quiz-timer').style.background = '#FEE2E2';
      $('quiz-timer').style.color = 'var(--color-danger)';
    }
    if (tempsRestant <= 0) {
      clearInterval(timerInterval);
      forcerEchecTimeout();
    }
  }, 1000);
}

function forcerEchecTimeout() {
  document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  $('quiz-explanation-box').className = "explanation-box visible bad";
  $('explanation-status').textContent = "⏰ TEMPS ÉCOULÉ !";
  $('explanation-text').textContent = "Les 45 secondes maximales pour cet automatisme sont passées.";
  $('quiz-next').disabled = false;
  enregistrerLacune("automatismes_global", false, "Automatismes");
}

// ==========================================================================
// 🔁 RÉPÉTITION ESPACÉE (boîtes de Leitner) — remplace l'ancien seuil binaire 35%
// ==========================================================================

const LEITNER_INTERVALLES_JOURS = [1, 3, 7, 16, 35]; // index = box - 1

function enregistrerLacune(cle, estSucces = false, labelAffichage = null) {
  const now = Date.now();
  if (!AppState.leitner[cle]) {
    AppState.leitner[cle] = { box: 1, nextReview: now, derniereRevision: now, total: 0, echecs: 0, label: labelAffichage || cle };
  }
  const entry = AppState.leitner[cle];
  entry.label = labelAffichage || entry.label || cle;
  entry.total = (entry.total || 0) + 1;

  if (estSucces) {
    entry.box = Math.min((entry.box || 1) + 1, 5);
  } else {
    entry.echecs = (entry.echecs || 0) + 1;
    entry.box = 1;
  }

  entry.derniereRevision = now;
  entry.nextReview = now + LEITNER_INTERVALLES_JOURS[entry.box - 1] * 24 * 60 * 60 * 1000;

  localStorage.setItem('dnb_leitner_v3', JSON.stringify(AppState.leitner));
  analyserLacunes();
}

function analyserLacunes() {
  const now = Date.now();
  const dus = Object.entries(AppState.leitner)
    .filter(([cle, e]) => e.nextReview <= now)
    .sort((a, b) => a[1].nextReview - b[1].nextReview);

  if (dus.length > 0) {
    $('lacunes-box').classList.remove('hidden');
    const listeLabels = dus.slice(0, 3).map(([cle, e]) => e.label || cle).join(', ');
    const reste = dus.length > 3 ? ` (+${dus.length - 3} autre${dus.length - 3 > 1 ? 's' : ''})` : '';
    $('lacunes-text').innerHTML = `🔁 <b>Révision programmée :</b> ${dus.length} chapitre${dus.length > 1 ? 's' : ''} à revoir aujourd'hui (répétition espacée) — <b>${listeLabels}</b>${reste}.`;
  } else {
    $('lacunes-box').classList.add('hidden');
  }
}

// Statut personnel de maîtrise d'UN MODULE (chapitre), indexé sur son id — jamais sur son
// libellé de thème, partagé par plusieurs chapitres. Codé par FORME d'icône (pas par couleur
// rouge/vert/orange) pour ne jamais se confondre avec les barres de couverture du programme.
function statutMaitrise(chapitreId) {
  const e = AppState.leitner[chapitreId];
  if (!e) return { icone: '⚪', label: 'Pas encore testé' };
  if (e.nextReview <= Date.now()) return { icone: '🔄', label: 'À revoir aujourd\'hui' };
  if (e.box >= 4) return { icone: '✅', label: 'Maîtrisé (révision dans plusieurs jours)' };
  return { icone: '📝', label: 'En cours d\'apprentissage' };
}

// ==========================================================================
// ▰ PROGRESSION (effort) — distincte de l'acquis (mémoire). Compte les niveaux
// explorés jusqu'au bout + l'exercice rédigé fait, par chapitre.
// ==========================================================================

function enregistrerProgression(chapitreId, cle) {
  if (!AppState.progression[chapitreId]) AppState.progression[chapitreId] = {};
  AppState.progression[chapitreId][cle] = true;
  localStorage.setItem('dnb_progression_v1', JSON.stringify(AppState.progression));
}

function obtenirProgression(chapitre) {
  const total = 3 + (chapitre.exercice_ouvert ? 1 : 0);
  const p = AppState.progression[chapitre.id] || {};
  let faits = 0;
  [1, 2, 3].forEach(n => { if (p['niveau' + n]) faits++; });
  if (chapitre.exercice_ouvert && p.exercice) faits++;
  return { faits, total };
}

function segmentsVisuels(faits, total) {
  return '▰'.repeat(faits) + '▱'.repeat(Math.max(0, total - faits));
}

// ==========================================================================
// 📊 TABLEAU DE BORD « COUVERTURE DU PROGRAMME » — indicateur honnête, calculé
// ==========================================================================

function calculerCouverture() {
  const dataToUse = AppState.data || DATA_SECOURS;
  const detail = dataToUse.matieres.map(m => {
    const referentiel = m.referentiel_officiel || [];
    const total = referentiel.length;
    const couverts = new Set();
    (m.chapitres || []).forEach(c => (c.couvre || []).forEach(id => couverts.add(id)));
    const nbCouverts = total > 0 ? referentiel.filter(r => couverts.has(r.id)).length : 0;
    const pct = total > 0 ? Math.round((nbCouverts / total) * 100) : null;
    return { id: m.id, label: m.label || m.id, emoji: m.emoji || '📘', total, nbCouverts, pct };
  });
  const totalGlobal = detail.reduce((s, d) => s + d.total, 0);
  const couvertGlobal = detail.reduce((s, d) => s + d.nbCouverts, 0);
  const pctGlobal = totalGlobal > 0 ? Math.round((couvertGlobal / totalGlobal) * 100) : 0;
  return { detail, pctGlobal, totalGlobal, couvertGlobal };
}

function couleurCouverture(pct) {
  if (pct >= 70) return 'var(--color-success)';
  if (pct >= 40) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

// ==========================================================================
// 🚀 INITIALISATION
// ==========================================================================

async function initialiserApp() {
  const savedLeitner = localStorage.getItem('dnb_leitner_v3');
  if (savedLeitner) {
    try { AppState.leitner = JSON.parse(savedLeitner); } catch (e) { AppState.leitner = {}; }
  }

  const savedProgression = localStorage.getItem('dnb_progression_v1');
  if (savedProgression) {
    try { AppState.progression = JSON.parse(savedProgression); } catch (e) { AppState.progression = {}; }
  }

  const savedHistory = localStorage.getItem('dnb_history_anti_repeat');
  if (savedHistory) {
    try { AppState.historiqueQuestions = JSON.parse(savedHistory); } catch (e) { AppState.historiqueQuestions = []; }
  }

  try {
    const res = await fetch('troisieme.json');
    if (res.ok) {
      AppState.data = await res.json();
    } else {
      AppState.data = DATA_SECOURS;
    }
  } catch (e) {
    AppState.data = DATA_SECOURS;
  }

  if (!AppState.data || !AppState.data.matieres) {
    AppState.data = DATA_SECOURS;
  }

  construireMenuMatieres();
  analyserLacunes();
  configurerNavigation();
}

function construireMenuMatieres() {
  const container = $('matieres-container');
  if (!container) return;
  container.innerHTML = "";

  const dataToUse = AppState.data || DATA_SECOURS;
  const groupes = {};
  const couvertureParId = {};
  calculerCouverture().detail.forEach(d => { couvertureParId[d.id] = d; });

  dataToUse.matieres.forEach(m => {
    const cat = m.categorie || "Enseignement Général";
    if (!groupes[cat]) groupes[cat] = [];
    groupes[cat].push(m);
  });

  for (const [nomCategorie, listeMatieres] of Object.entries(groupes)) {
    const titreCategorie = document.createElement('div');
    titreCategorie.className = 'category-group-title';
    titreCategorie.textContent = nomCategorie;
    container.appendChild(titreCategorie);

    listeMatieres.forEach(m => {
      if (!m.chapitres) return;

      const card = document.createElement('div');
      card.className = 'card matiere-card-wrapper';

      const header = document.createElement('div');
      header.className = 'matiere-trigger-header';

      const defaultIcon = `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
      const svgIcon = SVGMappings[m.id] || defaultIcon;

      const cov = couvertureParId[m.id];
      const covBar = (cov && cov.total > 0) ? `
        <div style="margin-top:8px;">
          <div style="width:100%; height:4px; background:var(--border-color); border-radius:2px; overflow:hidden;">
            <div style="width:${cov.pct}%; height:100%; background:${couleurCouverture(cov.pct)};"></div>
          </div>
          <span style="font-size:0.62rem; font-weight:700; color:${couleurCouverture(cov.pct)}; text-transform:uppercase; letter-spacing:0.03em;">📚 Programme : ${cov.pct}% (${cov.nbCouverts}/${cov.total})</span>
        </div>
      ` : '';

      header.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:0; flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div class="header-icon-box">${svgIcon}</div>
            <h3 style="margin:0; font-size:1rem; font-weight:700; color:var(--text-primary); letter-spacing:-0.01em;">${m.label || m.id}</h3>
          </div>
          ${covBar}
        </div>
        <svg class="arrow-indicator" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      `;

      const bodyContent = document.createElement('div');
      bodyContent.className = 'matiere-chapters-body';

      m.chapitres.forEach(c => {
        const row = document.createElement('div');
        row.className = 'chapitre-item';
        row.style.cssText = "padding:16px 14px; margin-top:12px; background:var(--bg-card); border-radius:12px; display:flex; flex-direction:column; gap:10px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);";
        row.onclick = (e) => ouvrirPreQuiz(m.id, c.id, e);
        const statut = statutMaitrise(c.id);
        const prog = obtenirProgression(c);
        row.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="display:flex; align-items:center; gap:8px; font-weight:600; font-size:.88rem; padding-right:12px; text-align:left; color:var(--text-primary); line-height:1.4;">
              <span title="${statut.label}" style="font-size:0.85rem; flex-shrink:0;">${statut.icone}</span>
              ${c.titre}
            </span>
            <span style="font-size:.68rem; font-weight:700; color:var(--color-primary); background:#EEF2FF; padding:5px 10px; border-radius:8px; white-space:nowrap; text-transform:uppercase; letter-spacing:0.03em;">${c.theme || 'DNB'}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px; padding-left:2px;">
            <span style="font-size:0.8rem; color:var(--color-primary); letter-spacing:1px;">${segmentsVisuels(prog.faits, prog.total)}</span>
            <span style="font-size:0.65rem; font-weight:600; color:var(--text-secondary);">Progression : ${prog.faits}/${prog.total} étapes</span>
          </div>
        `;
        bodyContent.appendChild(row);
      });

      header.onclick = () => {
        const estOuvert = bodyContent.classList.contains('is-open');

        document.querySelectorAll('.matiere-chapters-body').forEach(b => b.classList.remove('is-open'));
        document.querySelectorAll('.arrow-indicator').forEach(a => a.classList.remove('rotated'));
        document.querySelectorAll('.matiere-card-wrapper').forEach(w => w.classList.remove('is-expanded'));

        if (!estOuvert) {
          bodyContent.classList.add('is-open');
          card.classList.add('is-expanded');
          header.querySelector('.arrow-indicator').classList.add('rotated');
        }
      };

      card.appendChild(header);
      card.appendChild(bodyContent);
      container.appendChild(card);
    });
  }
}

let currentMatiereSelected = null;
let currentChapitreSelected = null;

function ouvrirPreQuiz(matiereId, chapitreId, event) {
  if (event) event.stopPropagation();

  const dataToUse = AppState.data || DATA_SECOURS;
  currentMatiereSelected = dataToUse.matieres.find(m => m.id === matiereId);
  currentChapitreSelected = currentMatiereSelected.chapitres.find(c => c.id === chapitreId);

  $('home-screen').classList.add('hidden');
  $('pre-quiz-screen').classList.remove('hidden');

  $('pre-quiz-title').textContent = currentChapitreSelected.titre;
  $('pre-quiz-theme').textContent = currentChapitreSelected.theme || "Général";
  $('pre-quiz-cours-text').textContent = currentChapitreSelected.cours || "Résumé de cours non spécifié.";
  $('pre-quiz-piege-text').textContent = currentChapitreSelected.piege || "Pas de vigilance particulière recensée.";

  if (currentChapitreSelected.support_texte && $('pre-quiz-support-card')) {
    $('pre-quiz-support-card').classList.remove('hidden');
    $('pre-quiz-support-text').textContent = currentChapitreSelected.support_texte;
  } else if ($('pre-quiz-support-card')) {
    $('pre-quiz-support-card').classList.add('hidden');
  }

  $('btn-lvl-1').onclick = () => lancerQuiz(1);
  $('btn-lvl-2').onclick = () => lancerQuiz(2);
  $('btn-lvl-3').onclick = () => lancerQuiz(3);

  if (currentChapitreSelected.exercice_ouvert) {
    $('btn-open-exercice').classList.remove('hidden');
    $('btn-open-exercice').onclick = () => ouvrirExerciceOuvert();
  } else {
    $('btn-open-exercice').classList.add('hidden');
  }
}

function activerNav(navId) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if ($(navId)) $(navId).classList.add('active');
}

function goHome() {
  $('pre-quiz-screen').classList.add('hidden');
  if ($('open-exercise-screen')) $('open-exercise-screen').classList.add('hidden');
  $('quiz-screen').classList.add('hidden');
  $('flashcards-screen').classList.add('hidden');
  if ($('oral-screen')) $('oral-screen').classList.add('hidden');
  $('home-screen').classList.remove('hidden');
  clearInterval(timerInterval);
  $('quiz-timer').style.display = 'none';
  clearInterval(oralTimerInterval);
  oralTimerInterval = null;
  activerNav('nav-home');
  construireMenuMatieres();
}

function lancerQuiz(niveau) {
  AppState.quiz.chapitreId = currentChapitreSelected.id;
  AppState.quiz.idx = 0;
  AppState.quiz.score = 0;
  AppState.quiz.isAutomatisme = false;
  AppState.quiz.niveauFiltre = niveau;

  // FIX v6.0 : chaque chapitre (y compris en maths) utilise désormais SES PROPRES questions
  // rédigées, au lieu d'être systématiquement redirigé vers le générateur infini de %.
  // Le générateur infini reste exclusivement réservé au mode global "Automatismes".
  let pool = currentChapitreSelected.questions ? currentChapitreSelected.questions.filter(q => q.niveau === niveau) : [];
  AppState.quiz.questions = obtenirQuestionsFiltrees(pool, 3);

  if (AppState.quiz.questions.length === 0) {
    alert("Aucune question de ce niveau n'est disponible pour ce chapitre.");
    return;
  }

  if ($('quiz-support-toggle')) {
    if (currentChapitreSelected.support_texte) {
      $('quiz-support-toggle').classList.remove('hidden');
      $('quiz-support-text-box').textContent = currentChapitreSelected.support_texte;
      $('quiz-support-text-box').classList.add('hidden');
      $('quiz-support-toggle').onclick = () => $('quiz-support-text-box').classList.toggle('hidden');
    } else {
      $('quiz-support-toggle').classList.add('hidden');
      $('quiz-support-text-box').classList.add('hidden');
    }
  }

  $('pre-quiz-screen').classList.add('hidden');
  $('quiz-screen').classList.remove('hidden');
  afficherQuestion();
}

$('btn-mode-automatismes').onclick = () => {
  currentChapitreSelected = null;
  AppState.quiz.chapitreId = "automatismes_global";
  AppState.quiz.idx = 0;
  AppState.quiz.score = 0;
  AppState.quiz.isAutomatisme = true;
  AppState.quiz.questions = Array.from({ length: 10 }, () => genererQuestionAutomatisme());

  if ($('quiz-support-toggle')) $('quiz-support-toggle').classList.add('hidden');
  if ($('quiz-support-text-box')) $('quiz-support-text-box').classList.add('hidden');

  $('home-screen').classList.add('hidden');
  $('quiz-screen').classList.remove('hidden');
  afficherQuestion();
};

function afficherQuestion() {
  clearInterval(timerInterval);
  $('quiz-explanation-box').className = "explanation-box hidden";
  $('quiz-next').disabled = true;

  const totalQs = AppState.quiz.questions.length;
  const currentQ = AppState.quiz.questions[AppState.quiz.idx];

  $('quiz-progress-text').textContent = `Question ${AppState.quiz.idx + 1} / ${totalQs}`;
  $('quiz-progress-bar').style.width = `${((AppState.quiz.idx + 1) / totalQs) * 100}%`;
  $('quiz-question-text').textContent = currentQ.enonce;

  const optionsContainer = $('quiz-options-container');
  optionsContainer.innerHTML = "";

  currentQ.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.className = "option-btn";
    btn.textContent = opt;
    btn.onclick = () => soumettreReponse(index, btn);
    optionsContainer.appendChild(btn);
  });

  if (AppState.quiz.isAutomatisme) lancerTimer();
  else $('quiz-timer').style.display = 'none';
}

function soumettreReponse(indexChoisi, boutonClique) {
  clearInterval(timerInterval);
  const currentQ = AppState.quiz.questions[AppState.quiz.idx];
  const boutons = document.querySelectorAll('.option-btn');
  boutons.forEach(b => b.disabled = true);

  const estCorrect = (indexChoisi === currentQ.bonne_reponse);
  if (estCorrect) {
    AppState.quiz.score++;
    boutonClique.style.background = "#DCFCE7";
    boutonClique.style.borderColor = "var(--color-success)";
    boutonClique.style.color = "#15803D";
    $('quiz-explanation-box').className = "explanation-box visible good";
    $('explanation-status').textContent = "✅ EXCELLENT";
  } else {
    boutonClique.style.background = "#FEE2E2";
    boutonClique.style.borderColor = "var(--color-danger)";
    boutonClique.style.color = "#B91C1C";
    if (boutons[currentQ.bonne_reponse]) {
      boutons[currentQ.bonne_reponse].style.background = "#DCFCE7";
      boutons[currentQ.bonne_reponse].style.borderColor = "var(--color-success)";
      boutons[currentQ.bonne_reponse].style.color = "#15803D";
    }
    $('quiz-explanation-box').className = "explanation-box visible bad";
    $('explanation-status').textContent = "❌ COMPLÉMENT DE COURS";
  }

  $('explanation-text').textContent = currentQ.explication || "";
  $('quiz-next').disabled = false;

  const cleConcernee = currentChapitreSelected ? currentChapitreSelected.id : "automatismes_global";
  const labelConcerne = currentChapitreSelected ? currentChapitreSelected.titre : "Automatismes";
  enregistrerLacune(cleConcernee, estCorrect, labelConcerne);
}

$('quiz-next').onclick = () => {
  AppState.quiz.idx++;
  if (AppState.quiz.idx < AppState.quiz.questions.length) {
    afficherQuestion();
  } else {
    if (AppState.quiz.chapitreId && AppState.quiz.chapitreId !== "automatismes_global") {
      enregistrerProgression(AppState.quiz.chapitreId, 'niveau' + AppState.quiz.niveauFiltre);
    }
    alert(`🏁 Fin de session ! Score : ${AppState.quiz.score} / ${AppState.quiz.questions.length}`);
    goHome();
  }
};

$('quiz-close').onclick = () => {
  if (confirm("Voulez-vous quitter l'entraînement en cours ?")) goHome();
};

function ouvrirExerciceOuvert() {
  $('pre-quiz-screen').classList.add('hidden');
  $('open-exercise-screen').classList.remove('hidden');

  $('open-ex-title').textContent = currentChapitreSelected.titre;
  $('open-ex-enonce').textContent = currentChapitreSelected.exercice_ouvert.enonce;
  $('open-ex-textarea').value = "";
  $('open-ex-correction-box').classList.add('hidden');
  $('btn-validate-open-ex').classList.remove('hidden');

  $('btn-close-exercise').onclick = () => {
    $('open-exercise-screen').classList.add('hidden');
    $('pre-quiz-screen').classList.remove('hidden');
  };

  $('btn-validate-open-ex').onclick = () => {
    if ($('open-ex-textarea').value.trim().length < 5) {
      alert("Saisissez votre réflexion au brouillon avant d'afficher les critères de validation.");
      return;
    }
    $('btn-validate-open-ex').classList.add('hidden');
    $('open-ex-correction-box').classList.remove('hidden');

    const containerCriteres = $('open-ex-critere-list');
    containerCriteres.innerHTML = "";
    if (currentChapitreSelected.exercice_ouvert.criteres) {
      currentChapitreSelected.exercice_ouvert.criteres.forEach((critere, index) => {
        const label = document.createElement('label');
        label.style.cssText = "display:flex; align-items:start; gap:10px; font-size:.85rem; background:white; padding:12px; border-radius:10px; cursor:pointer; border:1px solid var(--border-color); font-weight:500;";
        label.innerHTML = `<input type="checkbox" class="critere-cb" value="${index}" style="margin-top:2px;"> <span>${critere}</span>`;
        containerCriteres.appendChild(label);
      });
    }
  };

  $('btn-finish-open-ex').onclick = () => {
    const total = document.querySelectorAll('.critere-cb').length;
    const coches = document.querySelectorAll('.critere-cb:checked').length;
    alert(`Auto-évaluation enregistrée.`);
    enregistrerLacune(currentChapitreSelected.id, total > 0 ? (coches / total) >= 0.6 : true, currentChapitreSelected.titre);
    enregistrerProgression(currentChapitreSelected.id, 'exercice');
    construireMenuMatieres();
    goHome();
  };
}

// ==========================================================================
// 🎤 ORAL DE SOUTENANCE — méthode, banque de questions jury, chronomètre 15 min
// ==========================================================================

let oralTimerInterval = null;
let oralTimerSecondes = 15 * 60;
let oralQuestionsRestantes = [];

function ouvrirOral() {
  $('home-screen').classList.add('hidden');
  $('pre-quiz-screen').classList.add('hidden');
  $('quiz-screen').classList.add('hidden');
  if ($('open-exercise-screen')) $('open-exercise-screen').classList.add('hidden');
  $('flashcards-screen').classList.add('hidden');
  $('oral-screen').classList.remove('hidden');

  const dataToUse = AppState.data || DATA_SECOURS;
  const oral = dataToUse.oral_soutenance;
  if (!oral) return;

  const methodeContainer = $('oral-methode-list');
  methodeContainer.innerHTML = "";
  (oral.methode || []).forEach(etape => {
    const item = document.createElement('div');
    item.className = 'card';
    item.style.cssText = "margin-bottom:10px; padding:14px 16px;";
    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
        <span style="width:24px; height:24px; border-radius:50%; background:var(--color-primary); color:white; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:800; flex-shrink:0;">${etape.etape}</span>
        <b style="font-size:0.85rem; color:var(--text-primary);">${etape.titre}</b>
      </div>
      <p style="margin:0 0 0 34px; font-size:0.8rem; color:var(--text-secondary); line-height:1.5;">${etape.conseil}</p>
    `;
    methodeContainer.appendChild(item);
  });

  oralQuestionsRestantes = shuffleArr(oral.questions_jury || []);
  $('oral-question-text').textContent = "Appuie sur « Tirer une question » pour t'entraîner à l'oral.";

  resetOralTimer();
}

function tirerQuestionJury() {
  const dataToUse = AppState.data || DATA_SECOURS;
  const oral = dataToUse.oral_soutenance;
  if (!oral || !oral.questions_jury || oral.questions_jury.length === 0) return;
  if (oralQuestionsRestantes.length === 0) oralQuestionsRestantes = shuffleArr(oral.questions_jury);
  const q = oralQuestionsRestantes.pop();
  $('oral-question-text').textContent = `🎤 ${q}`;
}

function resetOralTimer() {
  clearInterval(oralTimerInterval);
  oralTimerInterval = null;
  oralTimerSecondes = 15 * 60;
  majAffichageOralTimer();
  if ($('btn-oral-timer-toggle')) $('btn-oral-timer-toggle').textContent = "▶️ Démarrer la simulation (15 min)";
}

function majAffichageOralTimer() {
  const m = Math.floor(oralTimerSecondes / 60);
  const s = oralTimerSecondes % 60;
  if ($('oral-timer-display')) $('oral-timer-display').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function toggleOralTimer() {
  if (oralTimerInterval) {
    clearInterval(oralTimerInterval);
    oralTimerInterval = null;
    $('btn-oral-timer-toggle').textContent = "▶️ Reprendre";
    return;
  }
  $('btn-oral-timer-toggle').textContent = "⏸️ En cours… (toucher pour pause)";
  oralTimerInterval = setInterval(() => {
    oralTimerSecondes--;
    majAffichageOralTimer();
    if (oralTimerSecondes <= 0) {
      clearInterval(oralTimerInterval);
      oralTimerInterval = null;
      $('oral-timer-display').textContent = "Terminé !";
      $('btn-oral-timer-toggle').textContent = "🔁 Recommencer";
      alert("⏰ Temps écoulé ! C'est exactement la durée réelle de ton oral de soutenance.");
      resetOralTimer();
    }
  }, 1000);
}

// ==========================================================================
// 🧭 NAVIGATION (Cours / Flashcards / Oral)
// ==========================================================================

let flashcardsPool = [];
let currentFlashcardIdx = 0;

function configurerNavigation() {
  if ($('nav-home')) {
    $('nav-home').onclick = () => goHome();
  }

  if ($('nav-flashcards')) {
    $('nav-flashcards').onclick = () => {
      genererFlashcardsPool();
      if (flashcardsPool.length === 0) {
        alert("Ajoutez des fiches de cours ou pièges dans votre catalogue pour générer les flashcards.");
        return;
      }
      currentFlashcardIdx = 0;
      $('home-screen').classList.add('hidden');
      $('pre-quiz-screen').classList.add('hidden');
      $('quiz-screen').classList.add('hidden');
      if ($('open-exercise-screen')) $('open-exercise-screen').classList.add('hidden');
      if ($('oral-screen')) $('oral-screen').classList.add('hidden');
      $('flashcards-screen').classList.remove('hidden');
      activerNav('nav-flashcards');
      afficherFlashcard();
    };
  }

  if ($('nav-oral')) {
    $('nav-oral').onclick = () => {
      activerNav('nav-oral');
      ouvrirOral();
    };
  }

  if ($('btn-oral-tirer-question')) {
    $('btn-oral-tirer-question').onclick = () => tirerQuestionJury();
  }

  if ($('btn-oral-timer-toggle')) {
    $('btn-oral-timer-toggle').onclick = () => toggleOralTimer();
  }

  const cardBox = $('flashcard-card-box');
  if (cardBox) {
    cardBox.onclick = (e) => {
      e.stopPropagation();
      cardBox.classList.toggle('flipped');
    };
  }

  if ($('flashcard-next')) {
    $('flashcard-next').onclick = (e) => {
      e.stopPropagation();
      currentFlashcardIdx++;
      if (currentFlashcardIdx >= flashcardsPool.length) {
        alert("🎉 Bravo ! Toutes les flashcards actives ont été consultées.");
        goHome();
      } else {
        afficherFlashcard();
      }
    };
  }
}

function genererFlashcardsPool() {
  flashcardsPool = [];
  const dataToUse = AppState.data || DATA_SECOURS;

  dataToUse.matieres.forEach(m => {
    if (!m.chapitres) return;
    m.chapitres.forEach(c => {
      if (c.cours && c.cours.trim() !== "") {
        flashcardsPool.push({
          matiere: m.label || m.id,
          chapitre: c.titre,
          recto: `Que faut-il impérativement retenir sur le chapitre :\n\n"${c.titre}" ?`,
          verso: c.cours
        });
      }
      if (c.piege && c.piege.trim() !== "") {
        flashcardsPool.push({
          matiere: m.label || m.id,
          chapitre: c.titre,
          recto: `Quel piège classique les correcteurs du Brevet cachent-ils sur :\n\n"${c.titre}" ?`,
          verso: c.piege
        });
      }
    });
  });

  flashcardsPool = shuffleArr(flashcardsPool);
}

function afficherFlashcard() {
  if (flashcardsPool.length === 0) return;
  const card = flashcardsPool[currentFlashcardIdx];
  $('flashcard-card-box').classList.remove('flipped');

  $('flashcard-meta').textContent = `${card.matiere} • ${card.chapitre} (${currentFlashcardIdx + 1}/${flashcardsPool.length})`;
  $('flashcard-front-text').textContent = card.recto;
  $('flashcard-back-text').textContent = card.verso;
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

document.addEventListener('DOMContentLoaded', initialiserApp);
