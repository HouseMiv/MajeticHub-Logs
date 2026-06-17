const updateResultsCount = (count) => {
    const el = document.getElementById('resultsCount');
    if (el) el.textContent = count;
};

const resetResultsHeader = () => {
    const resultsHeader = document.querySelector('.results__header');
    if (!resultsHeader) return;
    resultsHeader.innerHTML = `
        <span class="results__title">Команды <span class="results__count" id="resultsCount">0</span></span>
        <button onclick="copyAllPunishments()" class="copy-all-button" title="Копировать результат">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
            Копировать результат
        </button>
    `;
};

const punishStack = () => {
    const field = document.getElementById('id_punishField');
    const resultTable = document.getElementById('id_resultTable');
    const resultsContainer = document.getElementById('id_resultsContainer');
    const resultsCase = document.querySelector('.results-case');

    resultTable.innerHTML = '';
    resultsContainer.classList.remove('visible');
    resultsCase.classList.remove('visible');
    resetResultsHeader();
    updateResultsCount(0);

    if (!field.value.trim()) {
        showError('Пожалуйста, введите данные');
        return;
    }

    try {
        const regex = /(?:(?:ID|PUNISH|TIME|NAME):[^;]*;){4}/gm;
        let m, result = '';
        let errors = [];

        const lines = field.value.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || /^-+$/.test(line)) continue;

            if (!line.includes('ID:')) {
                errors.push(`Ошибка в строке ${i + 1}: отсутствует поле ID\nСтрока: "${line}"`);
            }
            if (!line.includes('PUNISH:')) {
                errors.push(`Ошибка в строке ${i + 1}: отсутствует поле PUNISH\nСтрока: "${line}"`);
            }
            if (!line.includes('NAME:')) {
                errors.push(`Ошибка в строке ${i + 1}: отсутствует поле NAME\nСтрока: "${line}"`);
            }

            const idMatch = line.match(/ID:([^;]*);/);
            if (idMatch && !idMatch[1].trim()) {
                errors.push(`Ошибка в строке ${i + 1}: пустое значение ID\nСтрока: "${line}"`);
            }

            const punishMatch = line.match(/PUNISH:([^;]*);/);
            if (punishMatch && !punishMatch[1].trim()) {
                errors.push(`Ошибка в строке ${i + 1}: пустое значение PUNISH\nСтрока: "${line}"`);
            }

            const nameMatch = line.match(/NAME:([^;]*);/);
            if (nameMatch && !nameMatch[1].trim()) {
                errors.push(`Ошибка в строке ${i + 1}: пустое значение NAME\nСтрока: "${line}"`);
            }

            if (punishMatch) {
                const punish = punishMatch[1].trim();
                if (punish !== 'warn' && punish !== '/warn') {
                    const timeMatch = line.match(/TIME:([^;]*);/);
                    if (!timeMatch || !timeMatch[1].trim()) {
                        errors.push(`Ошибка в строке ${i + 1}: отсутствует или пустое значение TIME для наказания ${punish}\nСтрока: "${line}"`);
                    }
                }
            }
        }

        if (errors.length > 0) {
            showError(errors.join('\n\n'));
            return;
        }

        while ((m = regex.exec(field.value)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            m.forEach((match) => {
                if (!match.match(/ID:;PUNISH:;TIME:;NAME:;/)) {
                    result += match;
                }
            });
        }

        if (!result) {
            showError('Неверный формат данных. Проверьте, что все строки имеют правильный формат:\nID:значение;PUNISH:значение;TIME:значение;NAME:значение;');
            return;
        }

        let fieldArr = result.split(';').filter(Boolean);
        let idArr = [];
        let punishArr = [];
        let timeArr = [];
        let nameArr = [];
        let resultArr = [];

        for (let i = 0; i < fieldArr.length; i++) {
            if (fieldArr[i].includes('ID:')) {
                const id = fieldArr[i].split(':')[1]?.trim();
                if (id) idArr.push(fieldArr[i]);
            }
            else if (fieldArr[i].includes('PUNISH:')) {
                const punish = fieldArr[i].split(':')[1]?.trim();
                if (punish) punishArr.push(fieldArr[i]);
            }
            else if (fieldArr[i].includes('TIME:')) timeArr.push(fieldArr[i]);
            else if (fieldArr[i].includes('NAME:')) {
                const name = fieldArr[i].split(':')[1]?.trim();
                if (name) nameArr.push(fieldArr[i]);
            }
        }

        if (idArr.length !== punishArr.length || idArr.length !== nameArr.length) {
            showError('Неверный формат данных');
            return;
        }

        for (let i = 0; i < idArr.length; i++) {
            let id = idArr[i].split(':')[1]?.trim();
            let punish = punishArr[i].split(':')[1]?.trim();
            let time = timeArr[i]?.split(':')[1]?.trim();
            time = time ? Math.floor(parseInt(time)) : null;

            if (!id || !punish) continue;

            const timeLimits = {
                '/ajail': 720,
                '/mute': 720,
                '/ban': 9999,
                '/hardban': 9999,
                '/gunban': 9999
            };

            if (timeLimits[punish]) {
                time = Math.min(Math.max(1, time || 0), timeLimits[punish]);
            }

            if (punish === 'warn' || punish === '/warn') {
                resultArr.push({ id, punish, time: null, name: [nameArr[i].split(':')[1]?.trim()] });
                continue;
            }

            let index = resultArr.findIndex(item => item.id === id && item.punish === punish);

            if (index !== -1) {
                const newTime = (resultArr[index].time || 0) + (time || 0);
                resultArr[index].time = timeLimits[punish] ? Math.min(newTime, timeLimits[punish]) : newTime;
                resultArr[index].name.push(nameArr[i].split(':')[1]?.trim());
            } else {
                resultArr.push({ id, punish, time, name: [nameArr[i].split(':')[1]?.trim()] });
            }
        }

        const order = ['ajail', 'ban', 'hardban', 'gunban', 'mute', 'warn'];
        resultArr.sort((a, b) => {
            if (a.punish === 'ajail' && b.punish === 'ajail') {
                return b.time - a.time;
            }
            return order.indexOf(a.punish) - order.indexOf(b.punish);
        });

        for (let i = 0; i < resultArr.length; i++) {
            let { id, punish, time, name } = resultArr[i];
            let uniqueNames = [...new Set(name)];

            let row = document.createElement('tr');
            row.className = 'table__row';
            row.style.opacity = '0';
            row.style.transform = 'translateY(20px)';

            let cell = document.createElement('td');
            let commandText = '';
            if (punish === 'warn' || punish === '/warn') {
                commandText = `/${punish} ${id} ${uniqueNames.join(', ')}`;
            } else {
                commandText = `/${punish} ${id} ${punish === '/gunban' ? 'бесконечно' : time.toString()} ${uniqueNames.join(', ')}`;
            }
            cell.textContent = commandText;
            row.appendChild(cell);
            resultTable.appendChild(row);

            setTimeout(() => {
                row.style.transition = 'all 0.3s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, i * 100);
        }

        if (resultArr.length > 0) {
            updateResultsCount(resultArr.length);
            resultsContainer.classList.add('visible');
            resultsCase.classList.add('visible');
        }

    } catch (error) {
        console.error('Ошибка при обработке:', error);
        showError('Произошла ошибка при обработке данных. Пожалуйста, проверьте формат ввода.');
    }
};

const copyAllPunishments = () => {
    const resultTable = document.getElementById('id_resultTable');
    const rows = resultTable.querySelectorAll('tr');
    let allCommands = '';

    rows.forEach(row => {
        if (row.classList.contains('error-row')) return;
        const cell = row.querySelector('td');
        if (cell) {
            allCommands += cell.textContent.trim() + '\n';
        }
    });

    if (!allCommands) return;

    navigator.clipboard.writeText(allCommands).then(() => {
        const copyAllButton = document.querySelector('.copy-all-button');
        if (!copyAllButton) return;
        const originalHtml = copyAllButton.innerHTML;
        copyAllButton.innerHTML = 'Скопировано!';
        copyAllButton.classList.add('success');
        setTimeout(() => {
            copyAllButton.innerHTML = originalHtml;
            copyAllButton.classList.remove('success');
        }, 2000);
    }).catch(() => {
        showError('Не удалось скопировать текст');
    });
};

const showError = (message) => {
    const resultTable = document.getElementById('id_resultTable');
    const resultsContainer = document.getElementById('id_resultsContainer');
    const resultsCase = document.querySelector('.results-case');

    let html = '';
    const errorLines = message.split(/\n\n/);
    if (errorLines.length > 1) {
        html = `<div class='error-block'>
            <span class='error-caption'>Нажмите на ошибку, чтобы перейти к строке</span>` +
            errorLines.map(err => {
                const match = err.match(/строке (\d+)/i);
                if (match) {
                    const line = match[1];
                    return `<div class="error-line" data-line="${line}">${err.replace(/\n/g,'<br>')}</div>`;
                }
                return `<div style="color:var(--accent);text-align:left;padding:8px 0;">${err.replace(/\n/g,'<br>')}</div>`;
            }).join('') +
            `</div>`;
    } else {
        const match = message.match(/строке (\d+)/i);
        if (match) {
            const line = match[1];
            html = `<div class='error-block'>
                <span class='error-caption'>Нажмите на ошибку, чтобы перейти к строке</span>
                <div class="error-line" data-line="${line}">${message.replace(/\n/g,'<br>')}</div>
            </div>`;
        } else {
            html = `<div class='error-block'><div style="color:var(--accent);text-align:left;padding:8px 0;">${message.replace(/\n/g,'<br>')}</div></div>`;
        }
    }
    resultTable.innerHTML = `<tr class="table__row error-row"><td>${html}</td></tr>`;
    updateResultsCount(0);

    resultsContainer.classList.add('visible');
    resultsCase.classList.add('visible');

    document.querySelectorAll('.error-line').forEach(el => {
        el.addEventListener('click', function() {
            const line = parseInt(this.getAttribute('data-line'), 10);
            const textarea = document.getElementById('id_punishField');
            if (!textarea || isNaN(line)) return;
            const lines = textarea.value.split('\n');
            let pos = 0;
            for (let i = 0; i < line - 1 && i < lines.length; i++) {
                pos += lines[i].length + 1;
            }
            textarea.focus();
            textarea.setSelectionRange(pos, pos);
            const lineHeight = textarea.scrollHeight / lines.length;
            textarea.scrollTop = (line - 1) * lineHeight - textarea.clientHeight / 2 + lineHeight;
        });
    });
};

const autoResizeTextarea = (element) => {
    element.style.height = 'auto';
    element.style.height = (element.scrollHeight) + 'px';
};

const clearInput = () => {
    const field = document.getElementById('id_punishField');
    field.value = '';
    autoResizeTextarea(field);
    updateLineNumbers();
    document.getElementById('id_resultTable').innerHTML = '';
    document.getElementById('id_resultsContainer').classList.remove('visible');
    document.querySelector('.results-case').classList.remove('visible');
    resetResultsHeader();
    updateResultsCount(0);
};

const toggleTextareaSize = () => {
    const textarea = document.getElementById('id_punishField');

    if (textarea.style.height && textarea.style.height !== '120px') {
        textarea.style.height = '120px';
    } else {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('id_punishField');
    const resizeButton = document.querySelector('.resize-button');

    textarea.style.height = '120px';
    resizeButton.addEventListener('click', toggleTextareaSize);
});

document.getElementById('id_punishField').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        punishStack();
    }
});

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => preloader.remove(), 500);
        }
    }, 1500);
});

function updateLineNumbers() {
    const textarea = document.getElementById('id_punishField');
    const lineNumbers = document.getElementById('lineNumbers');
    if (!textarea || !lineNumbers) return;
    const lines = textarea.value.split('\n').length;
    let html = '';
    for (let i = 1; i <= lines; i++) {
        html += i + '<br>';
    }
    lineNumbers.innerHTML = html;
}

const punishField = document.getElementById('id_punishField');
if (punishField) {
    punishField.addEventListener('input', updateLineNumbers);
    punishField.addEventListener('scroll', function() {
        document.getElementById('lineNumbers').scrollTop = punishField.scrollTop;
    });
    updateLineNumbers();
}
