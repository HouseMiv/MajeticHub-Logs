const punishStack = () => {
    const field = document.getElementById('id_punishField');
    const resultTable = document.getElementById('id_resultTable');
    const resultsContainer = document.getElementById('id_resultsContainer');
    const copyButton = document.querySelector('.copy-button');
    const resultsCase = document.querySelector('.results-case');
    const serverSelect = document.getElementById('id_serverSelect');
    
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
    const selectedServer = serverSelect.value;

    // Server-specific rules
    const serverRules = {
        'New York': {
            maxAjailTime: 720,
            maxBanTime: 9999,
            maxHardbanTime: 9999,
            combineSameViolations: true,
            ajailToBan: null
        },
        'Detroit': {
            maxAjailTime: 720,
            maxBanTime: 9999,
            maxHardbanTime: 9999,
            combineSameViolations: true,
            ajailToBan: null
        },
        'Chicago': {
            maxAjailTime: 720,
            maxBanTime: 9999,
            maxHardbanTime: 9999,
            combineSameViolations: true,
            ajailToBan: null
        },
        'San Francisco': {
            maxAjailTime: 720,
            maxBanTime: 9999,
            maxHardbanTime: 9999,
            combineSameViolations: true,
            ajailToBan: null
        },
        'Atlanta': {
            maxAjailTime: 720,
            maxBanTime: 9999,
            maxHardbanTime: 9999,
            combineSameViolations: true,
            ajailToBan: null
        },
        'Los Angeles': {
            maxAjailTime: 720,
            maxBanTime: 9999,
            maxHardbanTime: 9999,
            combineSameViolations: true,
            ajailToBan: null
        },
        'Miami': {
            maxAjailTime: 720,
            maxBanTime: 9999,
            maxHardbanTime: 9999,
            combineSameViolations: true,
            ajailToBan: null
        },
        'Las Vegas': {
            maxAjailTime: 720,
            maxBanTime: 9999,
            maxHardbanTime: 9999,
            combineSameViolations: true,
            ajailToBan: null
        },
        'Washington': {
            maxAjailTime: 720,
            maxBanTime: 9999,
            maxHardbanTime: 9999,
            combineSameViolations: true,
            ajailToBan: null
        },
        'Boston': {
            maxAjailTime: 720,
            maxBanTime: 9999,
            maxHardbanTime: 9999,
            combineSameViolations: true,
            ajailToBan: (time, violations) => {
                if (time >= 120) {
                    // For Boston server, when total ajail time >= 120,
                    // ban time is equal to number of violations
                    const banTime = Math.max(3, violations.length);
                    return { command: 'ban', time: banTime };
                }
                return null;
            }
        },
        'Houston': {
            maxAjailTime: 90,
            maxBanTime: 9999,
            maxHardbanTime: 9999,
            combineSameViolations: true,
            ajailToBan: (time) => {
                if (time >= 105 && time <= 125) return { command: 'ban', time: 3 };
                if (time >= 126 && time <= 135) return { command: 'ban', time: 4 };
                if (time >= 136 && time <= 150) return { command: 'ban', time: 5 };
                if (time >= 151 && time <= 165) return { command: 'ban', time: 6 };
                if (time > 165) {
                    // Calculate additional days: every 15 minutes over 165 adds 1 day
                    const additionalDays = Math.floor((time - 165) / 15);
                    return { command: 'ban', time: 6 + additionalDays };
                }
                if (time >= 100) return { command: 'ajail', time: 90 };
                return null;
        }
        },
        'Seattle': {
            maxAjailTime: 720,
            maxBanTime: 9999,
            maxHardbanTime: 9999,
            combineSameViolations: true,
            ajailToBan: null
        }
    };

    for (const line of lines) {
        if (!line.trim()) continue;

        const match = line.match(/^\/(\w+)\s+(\d+)\s+(\d+)\s+(.+?)\s+by\s+(\w+)/);
        if (!match) continue;

        const [_, command, id, time, reason, admin] = match;
        const date = reason.match(/\(([^)]+)\)/)?.[1] || '';
        
        // Check if the violation is for the selected server

        // Get server-specific rules
        const rules = selectedServer === 'all' ? serverRules['New York'] : serverRules[selectedServer];
        
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
            
            // Apply server-specific time limits
            let newTime = existing.time + parseInt(time);
            
            // Get server-specific rules
            const rules = selectedServer === 'all' ? serverRules['New York'] : serverRules[selectedServer];
            
            // Special handling for Houston server
            if (selectedServer === 'Houston' && command === 'ajail') {
                // Apply Houston rules to individual times
                const currentTime = parseInt(time);
                const existingTime = existing.time;
                
                // First sum the times
                newTime = existingTime + currentTime;
                
                // Check if we need to convert to ban
                const conversion = rules.ajailToBan(newTime);
                if (conversion) {
                    if (conversion.command === 'ban') {
                        // Remove the ajail entry
                        resultMap.delete(key);
                        // Create a new ban entry
                        const banKey = `${id}-ban`;
                        if (!resultMap.has(banKey)) {
                            resultMap.set(banKey, {
                                id,
                                command: 'ban',
                                time: conversion.time,
                                violations: [...existing.violations, {
                                    reason: reason.trim(),
                                    admin,
                                    date
                                }]
                            });
                        } else {
                            const existingBan = resultMap.get(banKey);
                            // Accumulate ban time instead of taking max
                            existingBan.time += conversion.time;
                            existingBan.violations = [...existingBan.violations, ...existing.violations, {
                                reason: reason.trim(),
                                admin,
                                date
                            }];
                        }
                    } else if (conversion.command === 'ajail') {
                        // Update the ajail time to 90 and keep all violations
                        existing.time = conversion.time;
                        if (!existing.violations.some(v => 
                            v.reason === reason.trim() && 
                            v.admin === admin && 
                            v.date === date
                        )) {
                            existing.violations.push({
                                reason: reason.trim(),
                                admin,
                                date
                            });
                        }
                    }
                    continue;
                }
        }

            // Apply time limits based on server rules
            if (command === 'ajail' && newTime > rules.maxAjailTime) {
                newTime = rules.maxAjailTime;
            } else if (command === 'ban' && newTime > rules.maxBanTime) {
                newTime = rules.maxBanTime;
            } else if (command === 'hardban' && newTime > rules.maxHardbanTime) {
                newTime = rules.maxHardbanTime;
            }
            
            // Always use the accumulated time
            existing.time = newTime;
            
            if (rules.combineSameViolations) {
                // Check if this is a duplicate violation
                const isDuplicate = existing.violations.some(v => 
                    v.reason === reason.trim() && 
                    v.admin === admin && 
                    v.date === date
                );
                
                if (!isDuplicate) {
                    existing.violations.push({
                        reason: reason.trim(),
                        admin,
                        date
                    });
                }
            } else {
                existing.violations.push({
                    reason: reason.trim(),
                    admin,
                    date
                });
        }

            // For Boston server, check if we need to convert to ban
            if (selectedServer === 'Boston' && command === 'ajail') {
                const conversion = rules.ajailToBan(existing.time, existing.violations);
                if (conversion) {
                    // Remove the ajail entry
                    resultMap.delete(key);
                    // Create a new ban entry
                    const banKey = `${id}-ban`;
                    if (!resultMap.has(banKey)) {
                        // For new ban, time is equal to number of violations
                        resultMap.set(banKey, {
                            id,
                            command: 'ban',
                            time: Math.max(3, existing.violations.length),
                            violations: existing.violations
                        });
                    } else {
                        const existingBan = resultMap.get(banKey);
                        // Sum existing ban time with conversion time
                        existingBan.time += conversion.time;
                        existingBan.violations = [...existingBan.violations, ...existing.violations];
                    }
                }
            }
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

    // Display results
    for (let i = 0; i < sortedResults.length; i++) {
        const result = sortedResults[i];
        
        let row = document.createElement('tr');
        row.className = 'table__row';
        row.style.opacity = '0';
        row.style.transform = 'translateY(20px)';
        
        let cell = document.createElement('td');
        
        // Format command with combined violations
        let commandText = `/${result.command} ${result.id} `;
        
        // For Boston server, format dates and rules
        if (selectedServer === 'Boston' && result.command === 'ban') {
            // Group violations by admin
            const adminGroups = {};
            result.violations.forEach(v => {
                if (!adminGroups[v.admin]) {
                    adminGroups[v.admin] = [];
                }
                adminGroups[v.admin].push(v);
            });

            // Format each admin's violations
            const formattedViolations = [];
            Object.entries(adminGroups).forEach(([admin, violations]) => {
                // For each violation, keep it separate
                violations.forEach(v => {
                    const reasonWithoutDate = v.reason.replace(/\s*\([^)]+\)/, '').trim();
                    const date = v.reason.match(/\(([^)]+)\)/)?.[1] || '';
                    formattedViolations.push(`${reasonWithoutDate} (${date}) by ${admin}`);
                });
            });

            commandText += `${result.time} ${formattedViolations.join(', ')}`;
        } else {
            // Combine violations
            const violationTexts = result.violations.map(v => {
                const reasonWithoutDate = v.reason.replace(/\s*\([^)]+\)/, '').trim();
                return v.date ? `${reasonWithoutDate} (${v.date}) by ${v.admin}` : `${reasonWithoutDate} by ${v.admin}`;
            });
            commandText += `${result.time} ${violationTexts.join(', ')}`;
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

    if (sortedResults.length > 0) {
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
