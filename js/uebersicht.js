// Lade die relevanten Schichten aus LocalStorage oder setze eine leere Liste als Standardwert
let relevantShifts = loadFromLocalStorage('relevantShifts') || [];

// Funktion zum Speichern der relevanten Schichten in LocalStorage
function saveRelevantShifts(shifts) {
    saveToLocalStorage('relevantShifts', shifts);
}

// Funktion zum Laden von Daten aus LocalStorage
function loadFromLocalStorage(key) {
    let value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
}

// Schichtstarts und -enden pro Tag analysieren (nur relevante Schichten)
function analyzeShiftStartsAndEnds(rows, dayIndex) {
    let shiftStarts = {};
    let shiftEnds = {};

    for (let i = 1; i < rows.length; i++) {
        let cols = rows[i];

        if (!cols || !cols[dayIndex]) continue;

        let shiftType = cols[dayIndex];

        if (relevantShifts.includes(shiftType)) {
            let shiftTime = rows[i - 1][dayIndex] ? rows[i - 1][dayIndex].trim() : '';
            if (shiftTime.includes('-')) {
                let times = shiftTime.split('-');
                let startHour = parseInt(times[0].trim().split(':')[0]);
                let endHour = parseInt(times[1].trim().split(':')[0]);

                if (endHour === 0) endHour = 24;

                let startTime = `${startHour}:00`;
                if (!shiftStarts[startTime]) shiftStarts[startTime] = 0;
                shiftStarts[startTime]++;

                let endTime = `${endHour}:00`;
                if (!shiftEnds[endTime]) shiftEnds[endTime] = 0;
                shiftEnds[endTime]++;
            }
        }
    }

    return { shiftStarts, shiftEnds };
}

// Funktion zur Darstellung der Übersicht in einer Tabelle (mit Start- und Endzeiten)
function displayOverview(shiftStarts, shiftEnds, day) {
    const overviewTable = document.createElement('table');
    overviewTable.innerHTML = `<thead>
                            <tr>
                                <th>Uhrzeit</th>
                                <th>Start</th>
                                <th>Ende</th>
                            </tr>
                            </thead>`;
    const tbody = document.createElement('tbody');

    // Kombiniere Start- und Endzeiten in einer Tabelle, sortiere nach Uhrzeit
    const allTimes = [...new Set([...Object.keys(shiftStarts), ...Object.keys(shiftEnds)])].sort((a, b) => parseInt(a) - parseInt(b));

    allTimes.forEach(time => {
        const starts = shiftStarts[time] || 0;
        const ends = shiftEnds[time] || 0;
        const row = document.createElement('tr');

        row.innerHTML = `<td>${time}</td>
                         <td style="color: ${starts >= 3 ? 'red' : 'black'}">${starts}</td>
                         <td style="color: ${ends >= 3 ? 'red' : 'black'}">${ends}</td>`;
        tbody.appendChild(row);
    });

    overviewTable.appendChild(tbody);
    document.getElementById('overviewTable').innerHTML = `<h3>Schichtstarts und -enden für ${day}</h3>`;
    document.getElementById('overviewTable').appendChild(overviewTable);
}

// Funktion zum Laden der Daten und Erstellen der Tages-Navigation
function loadOverviewData() {
    let savedHourlyData = loadFromLocalStorage('workScheduleData');
    let savedDays = loadFromLocalStorage('workScheduleDays');
    let rawExcelData = loadFromLocalStorage('rawExcelData');

    if (savedHourlyData && savedDays && rawExcelData) {
        const dayNavigation = document.getElementById('dayNavigation');
        dayNavigation.innerHTML = ''; 

        savedDays.forEach((day, index) => {
            const button = document.createElement('button');
            button.className = 'day-btn';
            button.dataset.day = `day${index + 1}`;
            button.textContent = day;
            dayNavigation.appendChild(button);

            button.addEventListener('click', () => {
                document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const { shiftStarts, shiftEnds } = analyzeShiftStartsAndEnds(rawExcelData, index + 1); // Index + 1, um Spalte B zu berücksichtigen
                displayOverview(shiftStarts, shiftEnds, day);
            });
        });

        const { shiftStarts, shiftEnds } = analyzeShiftStartsAndEnds(rawExcelData, 1); // Für den ersten Tag, Spalte B
        displayOverview(shiftStarts, shiftEnds, savedDays[0]);
        document.querySelector(`[data-day="day1"]`).classList.add('active');
    } else {
        alert('Keine Arbeitsstunden-Daten gefunden. Bitte lade zuerst die Excel-Datei auf der Tabellen-Seite hoch.');
    }
}

// Lade gespeicherte Daten beim Start, falls vorhanden
window.onload = function () {
    loadOverviewData();
};
