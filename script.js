// Gestione dei periodi di lavoro
let periodCount = 0;
const STORAGE_KEY = 'onlyfarms_periods';

// Inizializza la pagina
document.addEventListener('DOMContentLoaded', function() {
    const addPeriodBtn = document.getElementById('addPeriodBtn');
    addPeriodBtn.addEventListener('click', addPeriod);
    
    // Carica i dati salvati o aggiungi il primo periodo vuoto
    loadPeriods();
});

// Aggiunge un nuovo periodo di lavoro
function addPeriod(periodData = null) {
    periodCount++;
    const periodsContainer = document.getElementById('periodsContainer');
    
    // Calcola il numero del periodo basandosi sui periodi esistenti
    const existingPeriods = document.querySelectorAll('.period-item');
    const periodNumber = existingPeriods.length + 1;
    
    // Usa i dati forniti o valori di default
    const description = periodData?.description || '';
    const weeks = periodData?.weeks || '1';
    const hours = periodData?.hours || '';
    const isCollapsed = periodData?.collapsed !== undefined ? periodData.collapsed : (periodNumber > 1);
    
    const periodItem = document.createElement('div');
    periodItem.className = 'period-item';
    periodItem.id = `period-${periodCount}`;
    periodItem.setAttribute('data-period-number', periodNumber);
    
    periodItem.innerHTML = `
        <div class="period-header-clickable" onclick="togglePeriod(${periodCount})">
            <div class="period-header-info">
                <span class="period-number">Periodo ${periodNumber}</span>
                <span class="period-summary" id="summary-${periodCount}">
                    <span class="summary-desc" id="summary-desc-${periodCount}">-</span>
                    <span class="summary-hours" id="summary-hours-${periodCount}">0 ore</span>
                    <span class="summary-days" id="summary-days-${periodCount}">0 giorni</span>
                </span>
            </div>
            <div class="period-header-actions">
                <span class="toggle-icon" id="toggle-icon-${periodCount}">▼</span>
                ${periodNumber > 1 ? `<button class="remove-period-btn" onclick="event.stopPropagation(); removePeriod(${periodCount})">Rimuovi</button>` : ''}
            </div>
        </div>
        <div class="period-content" id="content-${periodCount}">
            <div class="period-fields">
                <div class="field-group full-width">
                    <label for="description-${periodCount}">Descrizione (opzionale):</label>
                    <input type="text" id="description-${periodCount}" placeholder="Es. Farm work a Mildura, Victoria" value="${description}" oninput="updatePeriodSummary(${periodCount}); savePeriods()">
                </div>
                <div class="field-group">
                    <label for="weeks-${periodCount}">Numero di settimane nel payslip:</label>
                    <select id="weeks-${periodCount}" onchange="calculateDays(); savePeriods()">
                        <option value="1" ${weeks === '1' ? 'selected' : ''}>1 settimana</option>
                        <option value="2" ${weeks === '2' ? 'selected' : ''}>2 settimane</option>
                    </select>
                </div>
                <div class="field-group">
                    <label for="hours-${periodCount}">Ore totali lavorate:</label>
                    <input type="number" id="hours-${periodCount}" min="0" step="0.5" placeholder="Es. 35" value="${hours}" oninput="calculateDays(); savePeriods()">
                </div>
            </div>
        </div>
    `;
    
    periodsContainer.appendChild(periodItem);
    
    // Imposta lo stato collapsed/expanded
    const content = document.getElementById(`content-${periodCount}`);
    const icon = document.getElementById(`toggle-icon-${periodCount}`);
    if (content && icon) {
        if (isCollapsed) {
            content.style.display = 'none';
            icon.textContent = '▶';
            periodItem.classList.add('collapsed');
        } else {
            content.style.display = 'block';
            icon.textContent = '▼';
            periodItem.classList.remove('collapsed');
        }
    }
    
    // Aggiorna il summary iniziale
    updatePeriodSummary(periodCount);
    calculateDays();
    savePeriods();
}

// Rimuove un periodo di lavoro
function removePeriod(periodId) {
    const periodItem = document.getElementById(`period-${periodId}`);
    if (periodItem) {
        periodItem.remove();
        // Rinumera i periodi rimanenti
        renumberPeriods();
        calculateDays();
        savePeriods();
    }
}

// Rinumera i periodi dopo la rimozione
function renumberPeriods() {
    const periods = document.querySelectorAll('.period-item');
    periods.forEach((period, index) => {
        const periodNumber = index + 1;
        
        // Ottieni l'ID originale del periodo (basato su periodCount)
        const originalId = period.id.split('-')[1];
        
        // Aggiorna solo il numero visualizzato, non l'ID
        const periodNumberEl = period.querySelector('.period-number');
        if (periodNumberEl) periodNumberEl.textContent = `Periodo ${periodNumber}`;
        
        // Aggiorna l'attributo data-period-number
        period.setAttribute('data-period-number', periodNumber);
        
        // Aggiorna il pulsante rimuovi
        const removeBtn = period.querySelector('.remove-period-btn');
        if (removeBtn) {
            removeBtn.setAttribute('onclick', `event.stopPropagation(); removePeriod(${originalId})`);
        } else if (periodNumber > 1) {
            // Aggiungi il pulsante rimuovi se non c'è e ci sono più periodi
            const headerActions = period.querySelector('.period-header-actions');
            if (headerActions) {
                const removeButton = document.createElement('button');
                removeButton.className = 'remove-period-btn';
                removeButton.textContent = 'Rimuovi';
                removeButton.setAttribute('onclick', `event.stopPropagation(); removePeriod(${originalId})`);
                headerActions.appendChild(removeButton);
            }
        }
        
        // Aggiorna il summary dopo la rinumerazione (usando l'ID originale)
        updatePeriodSummary(originalId);
    });
}

// Calcola i giorni per un singolo periodo
function calculatePeriodDays(weeks, hours) {
    if (!hours || hours <= 0) return 0;
    
    const hoursNum = parseFloat(hours);
    const weeksNum = parseInt(weeks);
    
    if (weeksNum === 1) {
        // Una settimana: >= 35 ore = 7 giorni, altrimenti ore / 7
        if (hoursNum >= 35) {
            return 7;
        } else {
            return hoursNum / 7;
        }
    } else if (weeksNum === 2) {
        // Due settimane
        if (hoursNum >= 70) {
            // >= 70 ore = 14 giorni direttamente
            return 14;
        } else {
            // Prima settimana: >= 35 = 7 giorni, altrimenti ore / 7
            // Resto nella seconda settimana con stessa regola
            let totalDays = 0;
            let remainingHours = hoursNum;
            
            // Prima settimana
            if (remainingHours >= 35) {
                totalDays += 7;
                remainingHours -= 35;
            } else {
                const firstWeekDays = remainingHours / 7;
                totalDays += firstWeekDays;
                remainingHours = 0;
            }
            
            // Seconda settimana (se ci sono ore rimanenti)
            if (remainingHours > 0) {
                if (remainingHours >= 35) {
                    totalDays += 7;
                } else {
                    totalDays += remainingHours / 7;
                }
            }
            
            return totalDays;
        }
    }
    
    return 0;
}

// Calcola tutti i giorni e aggiorna il display
function calculateDays() {
    const periods = document.querySelectorAll('.period-item');
    let totalDays = 0;
    
    periods.forEach((period) => {
        const periodId = period.id.split('-')[1];
        const weeksSelect = document.getElementById(`weeks-${periodId}`);
        const hoursInput = document.getElementById(`hours-${periodId}`);
        
        if (weeksSelect && hoursInput) {
            const weeks = weeksSelect.value;
            const hours = hoursInput.value;
            const days = calculatePeriodDays(weeks, hours);
            
            totalDays += days;
            
            // Aggiorna il summary del periodo
            updatePeriodSummary(periodId);
        }
    });
    
    // Aggiorna il risultato totale
    updateResult(totalDays);
    savePeriods();
}

// Aggiorna il summary del periodo nell'header
function updatePeriodSummary(periodId) {
    const descriptionInput = document.getElementById(`description-${periodId}`);
    const hoursInput = document.getElementById(`hours-${periodId}`);
    const weeksSelect = document.getElementById(`weeks-${periodId}`);
    
    const summaryDesc = document.getElementById(`summary-desc-${periodId}`);
    const summaryHours = document.getElementById(`summary-hours-${periodId}`);
    const summaryDays = document.getElementById(`summary-days-${periodId}`);
    
    if (descriptionInput && summaryDesc) {
        const desc = descriptionInput.value.trim();
        summaryDesc.textContent = desc || '-';
    }
    
    if (hoursInput && summaryHours) {
        const hours = hoursInput.value || 0;
        summaryHours.textContent = `${hours} ore`;
    }
    
    if (weeksSelect && hoursInput && summaryDays) {
        const weeks = weeksSelect.value;
        const hours = hoursInput.value || 0;
        const days = calculatePeriodDays(weeks, hours);
        summaryDays.textContent = `${days.toFixed(2)} giorni`;
    }
}

// Toggle per aprire/chiudere il periodo
function togglePeriod(periodId) {
    const content = document.getElementById(`content-${periodId}`);
    const icon = document.getElementById(`toggle-icon-${periodId}`);
    const periodItem = document.getElementById(`period-${periodId}`);
    
    if (content && icon && periodItem) {
        const isExpanded = content.style.display !== 'none';
        
        if (isExpanded) {
            content.style.display = 'none';
            icon.textContent = '▶';
            periodItem.classList.add('collapsed');
        } else {
            content.style.display = 'block';
            icon.textContent = '▼';
            periodItem.classList.remove('collapsed');
        }
        
        savePeriods();
    }
}

// Aggiorna il display del risultato totale
function updateResult(totalDays) {
    const resultValue = document.getElementById('resultValue');
    const resultMessage = document.getElementById('resultMessage');
    
    const decimalDays = totalDays.toFixed(2);
    const roundedDays = Math.floor(totalDays);
    
    resultValue.textContent = decimalDays;
    
    if (totalDays >= 88) {
        resultValue.className = 'result-value success';
        const extraDays = roundedDays - 88;
        resultMessage.textContent = `Hai completato ${decimalDays} giorni su 88 → Puoi richiedere il secondo visto! ${extraDays > 0 ? `(Hai ${extraDays} giorn${extraDays > 1 ? 'i' : 'o'} in più)` : ''}`;
        resultMessage.className = 'result-message success';
    } else {
        resultValue.className = 'result-value warning';
        const remainingDays = 88 - roundedDays;
        resultMessage.textContent = `Ti manca${remainingDays > 1 ? 'no' : ''} ancora ${remainingDays} giorn${remainingDays > 1 ? 'i' : 'o'}`;
        resultMessage.className = 'result-message warning';
    }
    
    // Se non ci sono giorni ancora, mostra messaggio informativo
    if (totalDays === 0) {
        resultMessage.textContent = 'Inserisci i tuoi periodi di lavoro per iniziare';
        resultMessage.className = 'result-message info';
    }
}

// Salva tutti i periodi nel localStorage
function savePeriods() {
    const periods = [];
    const periodItems = document.querySelectorAll('.period-item');
    
    periodItems.forEach((periodItem) => {
        const periodId = periodItem.id.split('-')[1];
        const descriptionInput = document.getElementById(`description-${periodId}`);
        const weeksSelect = document.getElementById(`weeks-${periodId}`);
        const hoursInput = document.getElementById(`hours-${periodId}`);
        const content = document.getElementById(`content-${periodId}`);
        
        if (descriptionInput && weeksSelect && hoursInput) {
            periods.push({
                description: descriptionInput.value || '',
                weeks: weeksSelect.value || '1',
                hours: hoursInput.value || '',
                collapsed: content ? content.style.display === 'none' : false
            });
        }
    });
    
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(periods));
    } catch (e) {
        console.error('Errore nel salvataggio dei dati:', e);
    }
}

// Carica i periodi dal localStorage
function loadPeriods() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        
        if (savedData) {
            const periods = JSON.parse(savedData);
            
            if (periods && periods.length > 0) {
                // Carica i periodi salvati
                periods.forEach((periodData) => {
                    addPeriod(periodData);
                });
                return;
            }
        }
    } catch (e) {
        console.error('Errore nel caricamento dei dati:', e);
    }
    
    // Se non ci sono dati salvati, aggiungi un periodo vuoto
    addPeriod();
}

