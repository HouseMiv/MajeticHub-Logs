const punishStack = () => {
    const field = document.getElementById('id_punishField');
    const resultTable = document.getElementById('id_resultTable');
    const resultsContainer = document.getElementById('id_resultsContainer');
    const copyButton = document.querySelector('.copy-button');
    const resultsCase = document.querySelector('.results-case');
    
    resultTable.innerHTML = '';
    
    if (!field.value.trim()) {
        copyButton.style.display = 'none';
        resultsContainer.classList.remove('visible');
        resultsCase.classList.remove('visible');
        showError('Пожалуйста, введите данные');
        return;
    }

    // Parse input commands
    const lines = field.value.trim().split('\n');
    const resultMap = new Map();
    const warnCommands = [];

    for (const line of lines) {
        if (!line.trim()) continue;

        const match = line.match(/^\/(\w+)\s+(\d+)\s+(\d+)\s+(.+?)\s+by\s+(\w+)/);
        if (!match) continue;

        const [_, command, id, time, reason, admin] = match;
        const date = reason.match(/\(([^)]+)\)/)?.[1] || '';
        
        // Special handling for warn commands
        if (command === 'warn') {
            warnCommands.push({
                id,
                command,
                time: parseInt(time),
                reason: reason.trim(),
                admin,
                date
            });
            continue;
        }
        
        const key = `${id}-${command}`;
        if (!resultMap.has(key)) {
            resultMap.set(key, {
                id,
                command,
                time: parseInt(time),
                violations: [{
                    reason: reason.trim(),
                    admin,
                    date
                }]
            });
        } else {
            const existing = resultMap.get(key);
            existing.time += parseInt(time);
            existing.violations.push({
                reason: reason.trim(),
                admin,
                date
            });
        }
    }

    // Sort and format results
    const order = ['ban', 'hardban', 'ajail'];
    const sortedResults = Array.from(resultMap.values()).sort((a, b) => {
        if (a.command === b.command) {
            return b.time - a.time;
        }
        return order.indexOf(a.command) - order.indexOf(b.command);
    });

    // Add warn commands at the end
    const allResults = [...sortedResults, ...warnCommands];

    // Display results
    for (let i = 0; i < allResults.length; i++) {
        const result = allResults[i];
        
        let row = document.createElement('tr');
        row.className = 'table__row';
        row.style.opacity = '0';
        row.style.transform = 'translateY(20px)';
        
        let cell = document.createElement('td');
        
        // Format command with combined violations
        let commandText = `/${result.command} ${result.id} `;
        
        if (result.command === 'unban') {
            commandText += 'reban by talent';
        } else if (result.command === 'warn') {
            commandText += `${result.time} ${result.reason} by ${result.admin}`;
        } else {
            commandText += `${result.time} `;
            
            // Combine violations
            const violationTexts = result.violations.map(v => {
                const reasonWithoutDate = v.reason.replace(/\s*\([^)]+\)/, '');
                return `${reasonWithoutDate} (${v.date}) by ${v.admin}`;
            });
            commandText += violationTexts.join(', ');
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

    // Add copy all button
    const resultsHeader = document.querySelector('.results__header');
    resultsHeader.innerHTML = "";

    const copyAllButton = document.createElement('button');
    copyAllButton.className = 'copy-all-button';
    copyAllButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg> Копировать все';
    copyAllButton.title = 'Копировать все наказания';
    copyAllButton.onclick = copyAllPunishments;
    
    resultsHeader.appendChild(copyAllButton);

    if (allResults.length > 0) {
        copyButton.style.display = '';
        setTimeout(() => {
            resultsContainer.classList.add('visible');
            resultsCase.classList.add('visible');
        }, 100);
    } else {
        copyButton.style.display = 'none';
        resultsContainer.classList.remove('visible');
        resultsCase.classList.remove('visible');
    }
};

const copyResult = () => {
    const resultTable = document.getElementById('id_resultTable');
    const rows = resultTable.getElementsByTagName('tr');
    let text = '';
    
    for (let row of rows) {
        text += row.textContent + '\n';
    }
    
    navigator.clipboard.writeText(text).then(() => {
        const copyButton = document.querySelector('.copy-button');
        const originalText = copyButton.textContent;
        copyButton.textContent = 'Скопировано!';
        copyButton.classList.add('success');
        
        setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.classList.remove('success');
        }, 2000);
    }).catch(err => {
        showError('Не удалось скопировать текст');
    });
};

const copyAllPunishments = () => {
    const resultTable = document.getElementById('id_resultTable');
    const rows = resultTable.querySelectorAll('tr');
    let allCommands = '';
    
    rows.forEach(row => {
        const cell = row.querySelector('td');
        if (cell) {
            const commandText = cell.textContent.trim();
            allCommands += commandText + '\n';
        }
    });
    
    if (allCommands) {
        navigator.clipboard.writeText(allCommands).then(() => {
            const copyAllButton = document.querySelector('.copy-all-button');
            copyAllButton.classList.add('success');
            setTimeout(() => {
                copyAllButton.classList.remove('success');
            }, 1000);
        }).catch(err => {
            console.error('Ошибка при копировании:', err);
        });
    }
};

const showError = (message) => {
    const resultTable = document.getElementById('id_resultTable');
    const resultsContainer = document.getElementById('id_resultsContainer');
    const resultsCase = document.querySelector('.results-case');
    
    resultTable.innerHTML = `<tr class="table__row error-row"><td style="color: #fd1b54; text-align: center;">${message}</td></tr>`;
    
    setTimeout(() => {
        resultsContainer.classList.add('visible');
        resultsCase.classList.add('visible');
    }, 100);
};

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
